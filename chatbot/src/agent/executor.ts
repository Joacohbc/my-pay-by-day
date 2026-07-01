import { generateText, stepCountIs, type ModelMessage } from 'ai';
import { config } from '@/config.js';
import type { RequestContext } from '@/context.js';
import { groundingNow } from '@/dates.js';
import { compactIfNeeded } from '@/memory/compaction.js';
import { conversationMemory } from '@/memory/conversation.js';
import { longTermMemory } from '@/memory/longTerm.js';
import { largeModel } from '@/models.js';
import { agentSystemPrompt } from '@/prompts/system.js';
import { buildAgentTools } from '@/agent/agentTools.js';
import { buildAllTools, toolsForMode } from '@/agent/buildTools.js';
import { recordStep, updateStatus } from '@/agent/notify.js';
import { isPauseSignal } from '@/agent/signals.js';
import { agentStore, type AttachmentContent } from '@/agent/store.js';
import { TERMINAL_STATUSES } from '@/agent/types.js';

type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mediaType: string }
  | { type: 'file'; data: Uint8Array; mediaType: string };

const running = new Map<string, AbortController>();

export function submitTask(taskId: string): void {
  if (running.has(taskId)) return;
  void run(taskId);
}

export function forcePause(taskId: string): void {
  updateStatus(taskId, 'PAUSED');
  running.get(taskId)?.abort();
}

export function forceCancel(taskId: string): void {
  agentStore.setCancelRequested(taskId, true);
  const controller = running.get(taskId);
  if (controller) controller.abort();
  else updateStatus(taskId, 'CANCELLED');
}

/** On startup, any task still marked RUNNING died with the previous process; mark it interrupted. */
export function recoverTasks(): void {
  for (const task of agentStore.list('RUNNING')) {
    agentStore.setStatus(task.id, 'INTERRUPTED');
  }
}

function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

function attachmentPart(att: AttachmentContent): UserContentPart {
  const data = att.data ?? new Uint8Array();
  if (att.mime_type.startsWith('image/')) {
    return { type: 'image', image: toBase64(data), mediaType: att.mime_type };
  }
  if (att.mime_type.startsWith('audio/')) {
    return { type: 'file', data, mediaType: att.mime_type };
  }
  if (/^(text\/|application\/(json|csv))/.test(att.mime_type)) {
    return { type: 'text', text: `[ATTACHED FILE: ${att.file_name}]\n\`\`\`\n${Buffer.from(data).toString('utf8')}\n\`\`\`` };
  }
  return { type: 'text', text: `[ATTACHED FILE: ${att.file_name} (${att.mime_type}) — binary, not shown]` };
}

function buildInstructionContent(taskId: string, instruction: string): UserContentPart[] {
  const parts: UserContentPart[] = [{ type: 'text', text: instruction }];
  for (const att of agentStore.attachmentContents(taskId)) parts.push(attachmentPart(att));
  return parts;
}

function isAbort(error: unknown): boolean {
  const name = (error as Error)?.name;
  return name === 'AbortError' || name === 'TimeoutError' || name === 'ResponseAborted';
}

async function run(taskId: string): Promise<void> {
  const task = agentStore.rawTask(taskId);
  if (!task || TERMINAL_STATUSES.has(task.status)) return;

  const controller = new AbortController();
  running.set(taskId, controller);
  agentStore.setCancelRequested(taskId, false);

  const ctx: RequestContext = { timezone: task.timezone ?? 'UTC', lang: task.lang ?? 'en' };
  const isResumed = agentStore
    .steps(taskId)
    .some((s) => s.type === 'PROGRESS' || s.type === 'MESSAGE');

  try {
    updateStatus(taskId, 'RUNNING', 5, isResumed ? 'Resuming' : 'Analyzing the request');
    await compactIfNeeded(taskId, ctx.lang);

    if (conversationMemory.count(taskId) === 0) {
      conversationMemory.append(taskId, [
        { role: 'user', content: buildInstructionContent(taskId, task.user_instruction) } as ModelMessage,
      ]);
    }

    const toolSet = buildAllTools(ctx, buildAgentTools(taskId));
    const result = await generateText({
      model: largeModel(),
      system: agentSystemPrompt({
        now: groundingNow(ctx.timezone),
        timezone: ctx.timezone,
        lang: ctx.lang,
        memories: longTermMemory.contents(),
        mode: task.execution_mode,
        isResumed,
      }),
      messages: conversationMemory.load(taskId),
      tools: toolsForMode(toolSet, task.execution_mode),
      stopWhen: stepCountIs(config.agent.maxSteps),
      abortSignal: controller.signal,
    });

    conversationMemory.append(taskId, result.response.messages);
    if (result.text.trim()) recordStep(taskId, { type: 'MESSAGE', content: result.text.trim() });

    if (agentStore.status(taskId) !== 'PAUSED') {
      updateStatus(taskId, 'COMPLETED', 100, 'Done');
    }
  } catch (error) {
    handleError(taskId, error);
  } finally {
    running.delete(taskId);
  }
}

function handleError(taskId: string, error: unknown): void {
  if (isPauseSignal(error)) return; // status already PAUSED by the tool
  if (isAbort(error)) {
    if (agentStore.isCancelRequested(taskId)) {
      updateStatus(taskId, 'CANCELLED');
    } else if (agentStore.status(taskId) !== 'PAUSED') {
      updateStatus(taskId, 'INTERRUPTED');
    }
    return;
  }
  const message = (error as Error).message ?? 'Unknown error';
  recordStep(taskId, { type: 'ERROR', description: 'The agent failed', content: message });
  updateStatus(taskId, 'FAILED', undefined, 'Failed');
}
