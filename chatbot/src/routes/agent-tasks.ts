import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { BackendClient } from '@/backend/client.js';
import { requestContextFrom } from '@/context.js';
import { onTaskEvent } from '@/agent/events.js';
import { broadcastAction, recordStep } from '@/agent/notify.js';
import { forceCancel, forcePause, submitTask } from '@/agent/executor.js';
import { agentStore } from '@/agent/store.js';
import { conversationMemory } from '@/memory/conversation.js';
import type { AgentExecutionMode, AgentTaskStatus } from '@/agent/types.js';

interface SubmitBody {
  instruction: string;
  executionMode: AgentExecutionMode;
  fileIds?: number[];
}

interface MessageBody {
  message: string;
  fileIds?: number[];
}

const KIND_BY_PREFIX: Array<[RegExp, string]> = [
  [/^image\//, 'IMAGE'],
  [/^audio\//, 'AUDIO'],
  [/^application\/pdf/, 'PDF'],
  [/^(text\/|application\/json|application\/csv)/, 'TEXT'],
];

function kindOf(mimeType: string): string {
  return KIND_BY_PREFIX.find(([re]) => re.test(mimeType))?.[1] ?? 'BINARY';
}

async function attachFiles(backend: BackendClient, taskId: string, fileIds?: number[]): Promise<void> {
  for (const fileId of fileIds ?? []) {
    try {
      const meta = await backend.get<{ fileName: string; mimeType: string }>(`/files/${fileId}`);
      const dataUri = await backend.getText(`/files/${fileId}/content/base64`);
      const base64 = dataUri.includes(',') ? dataUri.slice(dataUri.indexOf(',') + 1) : dataUri;
      agentStore.saveAttachment(taskId, {
        fileName: meta.fileName,
        mimeType: meta.mimeType,
        kind: kindOf(meta.mimeType),
        data: new Uint8Array(Buffer.from(base64, 'base64')),
      });
    } catch {
      // skip unavailable attachments
    }
  }
}

export const agentTasksRoute = new Hono();

agentTasksRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as SubmitBody;
  if (!body.instruction?.trim()) return c.json({ error: 'instruction is required' }, 400);

  const task = agentStore.create({
    instruction: body.instruction,
    executionMode: body.executionMode ?? 'AUTONOMOUS',
    lang: ctx.lang,
    timezone: ctx.timezone,
  });
  await attachFiles(new BackendClient(ctx), task.id, body.fileIds);
  submitTask(task.id);
  return c.json(agentStore.detail(task.id), 202);
});

agentTasksRoute.get('/', (c) => {
  const status = c.req.query('status') as AgentTaskStatus | undefined;
  return c.json(agentStore.list(status));
});

agentTasksRoute.get('/:id', (c) => {
  const task = agentStore.detail(c.req.param('id'));
  return task ? c.json(task) : c.json({ error: 'not found' }, 404);
});

agentTasksRoute.post('/:id/cancel', (c) => {
  const id = c.req.param('id');
  if (!agentStore.rawTask(id)) return c.json({ error: 'not found' }, 404);
  forceCancel(id);
  return c.json(agentStore.detail(id));
});

agentTasksRoute.post('/:id/pause', (c) => {
  const id = c.req.param('id');
  if (!agentStore.rawTask(id)) return c.json({ error: 'not found' }, 404);
  forcePause(id);
  return c.json(agentStore.detail(id));
});

agentTasksRoute.post('/:id/resume', (c) => {
  const id = c.req.param('id');
  if (!agentStore.rawTask(id)) return c.json({ error: 'not found' }, 404);
  conversationMemory.append(id, [{ role: 'user', content: 'Continue the task where you left off.' }]);
  submitTask(id);
  return c.json(agentStore.detail(id), 202);
});

agentTasksRoute.delete('/:id', (c) => {
  agentStore.delete(c.req.param('id'));
  return c.body(null, 204);
});

agentTasksRoute.patch('/:id/mode', async (c) => {
  const id = c.req.param('id');
  const raw = await c.req.text();
  let mode = raw.trim().replace(/^"|"$/g, '');
  try {
    const parsed = JSON.parse(raw) as { mode?: string } | string;
    mode = typeof parsed === 'string' ? parsed : parsed.mode ?? mode;
  } catch {
    // raw already holds the value
  }
  agentStore.setExecutionMode(id, mode as AgentExecutionMode);
  return c.json(agentStore.detail(id));
});

agentTasksRoute.post('/:id/message', async (c) => {
  const ctx = requestContextFrom(c);
  const id = c.req.param('id');
  if (!agentStore.rawTask(id)) return c.json({ error: 'not found' }, 404);
  const body = (await c.req.json()) as MessageBody;
  await attachFiles(new BackendClient(ctx), id, body.fileIds);
  recordStep(id, { type: 'USER', content: body.message });
  conversationMemory.append(id, [{ role: 'user', content: body.message }]);
  submitTask(id);
  return c.json(agentStore.detail(id), 202);
});

agentTasksRoute.post('/:id/actions/:actionId/approve', async (c) => {
  const id = c.req.param('id');
  const actionId = Number(c.req.param('actionId'));
  const action = agentStore.getAction(actionId);
  if (!action || action.taskId !== id) return c.json({ error: 'action not found' }, 404);
  const { feedback } = (await c.req.json().catch(() => ({}))) as { feedback?: string };
  agentStore.resolveAction(actionId, 'APPROVED', feedback);
  broadcastAction(id, { ...action, status: 'APPROVED', resultMessage: feedback });
  conversationMemory.append(id, [
    { role: 'user', content: `The user APPROVED the requested action.${feedback ? ` Feedback: ${feedback}` : ''}` },
  ]);
  submitTask(id);
  return c.body(null, 202);
});

agentTasksRoute.post('/:id/actions/:actionId/reject', async (c) => {
  const id = c.req.param('id');
  const actionId = Number(c.req.param('actionId'));
  const action = agentStore.getAction(actionId);
  if (!action || action.taskId !== id) return c.json({ error: 'action not found' }, 404);
  const { feedback } = (await c.req.json().catch(() => ({}))) as { feedback?: string };
  agentStore.resolveAction(actionId, 'REJECTED', feedback);
  broadcastAction(id, { ...action, status: 'REJECTED', resultMessage: feedback });
  conversationMemory.append(id, [
    { role: 'user', content: `The user REJECTED the requested action.${feedback ? ` Feedback: ${feedback}` : ''}` },
  ]);
  submitTask(id);
  return c.body(null, 202);
});

agentTasksRoute.get('/:id/stream', (c) => {
  const id = c.req.param('id');
  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ data: JSON.stringify({ type: 'connected', taskId: id }) });
    const unsubscribe = onTaskEvent(id, (event) => {
      void stream.writeSSE({ data: JSON.stringify(event) });
    });
    stream.onAbort(() => unsubscribe());
    // Keep the stream open until the client disconnects.
    while (!stream.aborted) {
      await stream.sleep(30000);
      await stream.writeSSE({ data: JSON.stringify({ type: 'ping' }) });
    }
  });
});
