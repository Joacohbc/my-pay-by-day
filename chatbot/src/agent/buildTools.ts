import type { Tool } from 'ai';
import type { RequestContext } from '@/context.js';
import { logger } from '@/logging/logger.js';
import { buildDateTools } from '@/tools/dates.js';
import { buildFinanceTools } from '@/tools/finance.js';
import { buildMemoryTools } from '@/tools/memory.js';
import type { ExecutionMode } from '@/prompts/system.js';
import { selectTools, type KindedToolSet, type ToolKind } from '@/tools/types.js';

const ALLOWED_KINDS: Record<ExecutionMode, ReadonlySet<ToolKind>> = {
  AUTONOMOUS: new Set<ToolKind>(['READ', 'DRAFT_WRITE', 'WRITE', 'DRAFT_CONFIRM']),
  DRAFT_ONLY: new Set<ToolKind>(['READ', 'DRAFT_WRITE']),
  READ_ONLY: new Set<ToolKind>(['READ']),
  DRAFT_CONFIRMATION: new Set<ToolKind>(['READ', 'DRAFT_CONFIRM']),
};

const toolLog = logger.child('tool');

function returnedError(result: unknown): result is { error: string } {
  return typeof result === 'object' && result !== null && 'error' in result;
}

/** Wraps a tool's execute to log its name, input parameters, and result/error with timing. */
function withLogging(name: string, kinded: KindedToolSet[string]): KindedToolSet[string] {
  const original = kinded.tool.execute;
  if (!original) return kinded;
  const loggedTool: Tool = {
    ...kinded.tool,
    execute: (async (input: unknown, options: unknown) => {
      const startedAt = Date.now();
      toolLog.info(`→ ${name}`, { kind: kinded.kind, args: input });
      try {
        const result = await (original as (i: unknown, o: unknown) => Promise<unknown>)(input, options);
        const ms = Date.now() - startedAt;
        if (returnedError(result)) {
          toolLog.warn(`← ${name} returned error`, { ms, error: result.error });
        } else {
          toolLog.info(`← ${name}`, { ms });
        }
        toolLog.debug(`result ${name}`, { result });
        return result;
      } catch (e) {
        toolLog.error(`✗ ${name} threw`, { ms: Date.now() - startedAt, error: (e as Error).message });
        throw e;
      }
    }) as Tool['execute'],
  };
  return { kind: kinded.kind, tool: loggedTool };
}

function withToolLogging(toolSet: KindedToolSet): KindedToolSet {
  const wrapped: KindedToolSet = {};
  for (const [name, entry] of Object.entries(toolSet)) {
    wrapped[name] = withLogging(name, entry);
  }
  return wrapped;
}

/** Full kinded tool set shared by chat and the agent loop (domain + dates + memory). */
export function buildAllTools(ctx: RequestContext, extra: KindedToolSet = {}): KindedToolSet {
  return withToolLogging({
    ...buildDateTools(ctx),
    ...buildFinanceTools(ctx),
    ...buildMemoryTools(),
    ...extra,
  });
}

/** Selects the plain AI SDK tool set available for a given execution mode. */
export function toolsForMode(toolSet: KindedToolSet, mode: ExecutionMode): Record<string, Tool> {
  return selectTools(toolSet, ALLOWED_KINDS[mode]);
}
