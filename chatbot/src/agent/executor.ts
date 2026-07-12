import { generateText, stepCountIs, type ModelMessage } from 'ai';
import { config } from '@/config.js';
import { DEFAULT_CURRENCY, type RequestContext } from '@/context.js';
import { groundingNow } from '@/dates.js';
import { buildModelContext, compactIfNeeded } from '@/memory/compaction.js';
import { conversationMemory } from '@/memory/conversation.js';
import { longTermMemory } from '@/memory/longTerm.js';
import { largeModel } from '@/models.js';
import { agentSystemPrompt } from '@/prompts/system.js';
import { buildAgentTools } from '@/agent/agentTools.js';
import { buildAllTools, toolsForMode } from '@/agent/buildTools.js';
import { recordAction, recordStep, updateStatus } from '@/agent/notify.js';
import { isPauseSignal } from '@/agent/signals.js';
import { agentStore, type AttachmentContent } from '@/agent/store.js';
import { TERMINAL_STATUSES } from '@/agent/types.js';
import { logger } from '@/logging/logger.js';

const agentLog = logger.child('agent');

const STEP_LIMIT_MESSAGE: Record<string, string> = {
  en: 'I reached my step limit before finishing this task. Grant me more steps to continue where I left off.',
  es: 'Alcancé mi límite de pasos antes de terminar esta tarea. Concedeme más pasos para continuar donde quedé.',
};

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

  const ctx: RequestContext = {
    timezone: task.timezone ?? 'UTC',
    lang: task.lang ?? 'en',
    currency: task.currency ?? DEFAULT_CURRENCY,
  };
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
    const stepBudget = task.step_budget ?? config.agent.maxSteps;
    agentLog.info('starting agent task', { taskId, mode: task.execution_mode, instruction: task.user_instruction });
    const result = await generateText({
      model: largeModel(),
      system: agentSystemPrompt({
        now: groundingNow(ctx.timezone),
        timezone: ctx.timezone,
        lang: ctx.lang,
        currency: ctx.currency,
        memories: longTermMemory.contents(),
        mode: task.execution_mode,
        isResumed,
      }),
      messages: buildModelContext(taskId),
      tools: toolsForMode(toolSet, task.execution_mode),
      stopWhen: stepCountIs(stepBudget),
      abortSignal: controller.signal,
    });

    conversationMemory.append(taskId, result.response.messages);
    agentLog.info('completed agent task', { taskId, steps: result.steps.length, reply: result.text });
    if (result.text.trim()) recordStep(taskId, { type: 'MESSAGE', content: result.text.trim() });

    const hitStepLimit = result.steps.length >= stepBudget && result.steps.at(-1)?.finishReason === 'tool-calls';

    if (agentStore.status(taskId) === 'PAUSED') {
      // already paused by a tool (e.g. requestUserAction)
    } else if (hitStepLimit) {
      const step = recordStep(taskId, { type: 'MESSAGE', content: STEP_LIMIT_MESSAGE[ctx.lang] ?? STEP_LIMIT_MESSAGE.en });
      recordAction(taskId, { stepId: step.id, actionType: 'EXTEND_STEPS', payload: STEP_LIMIT_MESSAGE[ctx.lang] ?? STEP_LIMIT_MESSAGE.en });
      updateStatus(taskId, 'PAUSED', task.progress, 'Waiting for more steps');
    } else {
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
  agentLog.error('agent task failed', { taskId, error: message });
  recordStep(taskId, { type: 'ERROR', description: 'The agent failed', content: message });
  updateStatus(taskId, 'FAILED', undefined, 'Failed');
}
