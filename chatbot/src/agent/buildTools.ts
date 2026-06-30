import type { Tool } from 'ai';
import type { RequestContext } from '../context.js';
import { buildDateTools } from '../tools/dates.js';
import { buildFinanceTools } from '../tools/finance.js';
import { buildMemoryTools } from '../tools/memory.js';
import type { ExecutionMode } from '../prompts/system.js';
import { selectTools, type KindedToolSet, type ToolKind } from '../tools/types.js';

const ALLOWED_KINDS: Record<ExecutionMode, ReadonlySet<ToolKind>> = {
  AUTONOMOUS: new Set<ToolKind>(['READ', 'DRAFT_WRITE', 'WRITE', 'DRAFT_CONFIRM']),
  DRAFT_ONLY: new Set<ToolKind>(['READ', 'DRAFT_WRITE']),
  READ_ONLY: new Set<ToolKind>(['READ']),
  DRAFT_CONFIRMATION: new Set<ToolKind>(['READ', 'DRAFT_CONFIRM']),
};

/** Full kinded tool set shared by chat and the agent loop (domain + dates + memory). */
export function buildAllTools(ctx: RequestContext, extra: KindedToolSet = {}): KindedToolSet {
  return {
    ...buildDateTools(ctx),
    ...buildFinanceTools(ctx),
    ...buildMemoryTools(),
    ...extra,
  };
}

/** Selects the plain AI SDK tool set available for a given execution mode. */
export function toolsForMode(toolSet: KindedToolSet, mode: ExecutionMode): Record<string, Tool> {
  return selectTools(toolSet, ALLOWED_KINDS[mode]);
}
