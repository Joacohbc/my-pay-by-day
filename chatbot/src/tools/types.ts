import type { Tool } from 'ai';

/**
 * Capability class of a tool, used to filter the available tool set by the
 * agent execution mode. It encodes permission policy, not just data effect:
 * DRAFT_CONFIRM mutates real data like WRITE, but under a different policy —
 * the reviewed draft itself is the human approval, so chat never re-gates it,
 * and the DRAFT_CONFIRMATION mode can grant publishing without granting
 * arbitrary event edits.
 */
export type ToolKind = 'READ' | 'DRAFT_WRITE' | 'WRITE' | 'DRAFT_CONFIRM' | 'MEMORY' | 'ASK_USER';

/**
 * Frontend TanStack Query cache domains a tool can invalidate. Mirrors the frontend's
 * CacheDomain union; the generated manifest is typechecked against the frontend's type,
 * so any drift between the two unions fails the frontend build.
 */
export type CacheDomain =
  | 'events'
  | 'drafts'
  | 'duplicates'
  | 'nodes'
  | 'timePeriods'
  | 'categories'
  | 'tags'
  | 'tagGroups'
  | 'files'
  | 'aiMemory'
  | 'agentTasks'
  | 'subscriptions'
  | 'templates';

export const EVENT_MUTATION_DOMAINS: readonly CacheDomain[] = [
  'events',
  'drafts',
  'duplicates',
  'nodes',
  'timePeriods',
];

/**
 * Frontend-facing metadata every tool must declare. The gen:tools script exports it as
 * frontend/src/lib/chat/toolManifest.generated.ts, which is the single source for cache
 * invalidation, open-form patching and the per-tool progress labels shown in the chat UI.
 */
export interface ToolUiMeta {
  invalidates: readonly CacheDomain[];
  patchesForm?: boolean;
  label: { en: string; es: string };
}

export interface KindedTool {
  kind: ToolKind;
  ui: ToolUiMeta;
  tool: Tool;
}

export type KindedToolSet = Record<string, KindedTool>;

/** Filters a kinded tool set to a plain AI SDK tool set containing only allowed kinds. */
export function selectTools(
  toolSet: KindedToolSet,
  allowedKinds: ReadonlySet<ToolKind>,
): Record<string, Tool> {
  const selected: Record<string, Tool> = {};
  for (const [name, { kind, tool }] of Object.entries(toolSet)) {
    if (allowedKinds.has(kind)) selected[name] = tool;
  }
  return selected;
}
