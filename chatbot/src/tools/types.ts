import type { Tool } from 'ai';

/**
 * Capability class of a tool, used to filter the available tool set by the
 * agent execution mode (mirrors the Java `AgentToolKind`).
 */
export type ToolKind = 'READ' | 'DRAFT_WRITE' | 'WRITE' | 'DRAFT_CONFIRM' | 'ASK_USER';

export interface KindedTool {
  kind: ToolKind;
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
