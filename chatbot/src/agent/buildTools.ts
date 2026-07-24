import type { Tool } from 'ai';
import { toolRequestId, type RequestContext } from '@/context.js';
import { logger, type Logger } from '@/logging/logger.js';
import { currentRequestFields, runWithRequestContext } from '@/logging/requestStore.js';
import { buildCalculatorTools } from '@/tools/calculator.js';
import { buildConversationTools } from '@/tools/conversations.js';
import { buildDateTools } from '@/tools/dates.js';
import { buildFinanceTools } from '@/tools/finance.js';
import { buildMemoryTools } from '@/tools/memory.js';
import type { ExecutionMode } from '@/prompts/system.js';
import { selectTools, type KindedToolSet, type ToolKind } from '@/tools/types.js';

const ALLOWED_KINDS: Record<ExecutionMode, ReadonlySet<ToolKind>> = {
  AUTONOMOUS: new Set<ToolKind>(['READ', 'DRAFT_WRITE', 'WRITE', 'DRAFT_CONFIRM', 'MEMORY', 'ASK_USER']),
  DRAFT_ONLY: new Set<ToolKind>(['READ', 'DRAFT_WRITE']),
  READ_ONLY: new Set<ToolKind>(['READ']),
  DRAFT_CONFIRMATION: new Set<ToolKind>(['READ', 'DRAFT_CONFIRM']),
};

const toolLog = logger.child('tool');

/** Argument keys, in priority order, that identify the entity a tool call acts on. */
const TARGET_ID_KEYS = [
  'id', 'draftId', 'eventId', 'nodeId', 'templateId', 'categoryId', 'tagId', 'taskId', 'fileId',
  'entityId', 'originalEventId', 'targetEventId',
] as const;
const TARGET_ID_ARRAY_KEYS = ['draftIds', 'tagIds'] as const;

/** Extracts a loggable target id from tool args so errors are traceable to the entity they acted on. */
function targetIdOf(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const record = input as Record<string, unknown>;
  for (const key of TARGET_ID_KEYS) {
    const value = record[key];
    if (typeof value === 'number' || typeof value === 'string') return String(value);
  }
  for (const key of TARGET_ID_ARRAY_KEYS) {
    const value = record[key];
    if (Array.isArray(value) && value.length > 0) return value.slice(0, 5).join(',');
  }
  return undefined;
}

function returnedError(result: unknown): result is { error: string } {
  return typeof result === 'object' && result !== null && 'error' in result;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

async function* logIterable(callLog: Logger, name: string, startedAt: number, iterable: AsyncIterable<unknown>): AsyncGenerator<unknown> {
  let lastChunk: unknown;
  try {
    for await (const chunk of iterable) {
      lastChunk = chunk;
      yield chunk;
    }
  } catch (e) {
    callLog.error(`✗ ${name} threw`, { event: 'tool_threw', ms: Date.now() - startedAt, error: (e as Error).message });
    throw e;
  }
  const ms = Date.now() - startedAt;
  callLog.info(`← ${name}`, { event: 'tool_ok', ms });
  callLog.debug(`result ${name}`, { result: lastChunk });
}

async function logPromise(callLog: Logger, name: string, startedAt: number, result: Promise<unknown>): Promise<unknown> {
  try {
    const resolved = await result;
    const ms = Date.now() - startedAt;
    if (returnedError(resolved)) {
      callLog.warn(`← ${name} returned error`, { event: 'tool_error', ms, error: resolved.error });
    } else {
      callLog.info(`← ${name}`, { event: 'tool_ok', ms });
    }
    callLog.debug(`result ${name}`, { result: resolved });
    return resolved;
  } catch (e) {
    callLog.error(`✗ ${name} threw`, { event: 'tool_threw', ms: Date.now() - startedAt, error: (e as Error).message });
    throw e;
  }
}

/** Wraps a tool's execute to log its name, input parameters, and result/error with timing. Supports both plain and async-generator (preliminary results) execute functions. */
function withLogging(name: string, kinded: KindedToolSet[string], requestId: string): KindedToolSet[string] {
  const original = kinded.tool.execute;
  if (!original) return kinded;
  const loggedTool: Tool = {
    ...kinded.tool,
    execute: ((input: unknown, options: unknown) => {
      const startedAt = Date.now();
      const targetId = targetIdOf(input);
      const { toolCallId } = (options ?? {}) as { toolCallId?: string };
      // tool + kind + targetId are bound onto every line for this call (including error lines) so
      // dashboards and drill-down can filter/join on them without re-parsing the message string.
      const callLog = toolLog.with({ tool: name, kind: kinded.kind, ...(targetId !== undefined && { targetId }) });
      // The call runs under its own correlation id (still prefixed with the request's, and therefore
      // with the chat id) so the backend requests it triggers are attributable to this tool call.
      return runWithRequestContext({ ...currentRequestFields(), requestId: toolRequestId(requestId, name, toolCallId) }, () => {
        // Tool name + kind stay at INFO (so prod shows which tools the bot uses); the raw args
        // (which can carry user content) drop to DEBUG.
        callLog.info(`→ ${name}`, { event: 'tool_call' });
        callLog.debug(`→ ${name} args`, { args: input });
        const result = (original as (i: unknown, o: unknown) => unknown)(input, options);
        if (isAsyncIterable(result)) return logIterable(callLog, name, startedAt, result);
        return logPromise(callLog, name, startedAt, Promise.resolve(result));
      });
    }) as Tool['execute'],
  };
  return { ...kinded, tool: loggedTool };
}

function withToolLogging(toolSet: KindedToolSet, requestId: string): KindedToolSet {
  const wrapped: KindedToolSet = {};
  for (const [name, entry] of Object.entries(toolSet)) {
    wrapped[name] = withLogging(name, entry, requestId);
  }
  return wrapped;
}

/** Full kinded tool set shared by chat and the agent loop (domain + dates + memory). */
export function buildAllTools(ctx: RequestContext, extra: KindedToolSet = {}): KindedToolSet {
  return withToolLogging({
    ...buildDateTools(ctx),
    ...buildFinanceTools(ctx),
    ...buildMemoryTools(),
    ...buildConversationTools(ctx),
    ...buildCalculatorTools(),
    ...extra,
  }, ctx.requestId);
}

/** Selects the plain AI SDK tool set available for a given execution mode. */
export function toolsForMode(toolSet: KindedToolSet, mode: ExecutionMode): Record<string, Tool> {
  return selectTools(toolSet, ALLOWED_KINDS[mode]);
}

/**
 * Same mode-based filtering as toolsForMode, but additionally requires human approval
 * (via the AI SDK's needsApproval) before executing tools whose kind is in kindsRequiringApproval.
 * Used only by the interactive chat route — background tasks and delegated sub-agents already
 * have their own mode-based gating and must not be double-gated.
 */
export function toolsForModeWithApproval(
  toolSet: KindedToolSet,
  mode: ExecutionMode,
  kindsRequiringApproval: ReadonlySet<ToolKind>,
): Record<string, Tool> {
  const selected = selectTools(toolSet, ALLOWED_KINDS[mode]);
  const withApproval: Record<string, Tool> = {};
  for (const [name, plainTool] of Object.entries(selected)) {
    const kind = toolSet[name]?.kind;
    withApproval[name] = kind && kindsRequiringApproval.has(kind) ? { ...plainTool, needsApproval: true } : plainTool;
  }
  return withApproval;
}
