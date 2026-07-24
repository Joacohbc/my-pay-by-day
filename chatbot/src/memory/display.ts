export type DisplayPart =
  | { type: 'text'; text: string }
  | {
      type: 'file';
      mediaType: string;
      filename?: string;
      fileId?: number;
      typeLabel?: string;
      /** Inline data URL for legacy parts without a backend fileId; never set when fileId is present. */
      url?: string;
    }
  | {
      type: 'tool';
      toolName: string;
      toolCallId: string;
      state: 'result' | 'approval-requested';
      input?: unknown;
      /** Display-rich output (for delegateTask this is the full sub-agent UIMessage, not the model summary). */
      output?: unknown;
      approval?: { id: string; approved?: boolean; reason?: string };
      errorText?: string;
    };

export interface DisplayMessage {
  role: 'user' | 'assistant';
  parts: DisplayPart[];
}

/** Facts that only become known in conversation rows appended after a message was persisted:
 * tool outputs produced once a pending approval resolves, and the approval decision itself. */
export interface DisplayOverlays {
  outputsByCallId: Map<string, unknown>;
  pendingApprovalsByToolCallId: Map<string, string>;
  approvalReasonsByApprovalId: Map<string, string>;
}

export function parseDisplayJson(displayJson: string | null): DisplayMessage | null {
  if (!displayJson) return null;
  try {
    return JSON.parse(displayJson) as DisplayMessage;
  } catch {
    return null;
  }
}

function toolPartToUI(part: Extract<DisplayPart, { type: 'tool' }>, overlays: DisplayOverlays): Record<string, unknown> {
  const approvalId = part.approval?.id ?? overlays.pendingApprovalsByToolCallId.get(part.toolCallId);
  const isResponded = part.state === 'approval-requested' && approvalId != null && overlays.approvalReasonsByApprovalId.has(approvalId);
  const resolvedLater = part.state === 'approval-requested' && overlays.outputsByCallId.has(part.toolCallId);
  const state = resolvedLater ? 'result' : isResponded ? 'approval-responded' : part.state;
  const output = part.output ?? overlays.outputsByCallId.get(part.toolCallId);

  const approval =
    approvalId == null
      ? undefined
      : state === 'approval-requested'
        ? { id: approvalId }
        : { id: approvalId, approved: true, reason: overlays.approvalReasonsByApprovalId.get(approvalId) };

  return {
    type: `tool-${part.toolName}`,
    toolName: part.toolName,
    toolCallId: part.toolCallId,
    state,
    input: part.input,
    ...(state === 'result' ? { output } : {}),
    ...(approval != null ? { approval } : {}),
    ...(part.errorText != null ? { errorText: part.errorText } : {}),
  };
}

/** Maps a persisted DisplayMessage to the UIMessage part wire shapes the frontend consumes,
 * upgrading tool parts whose pending approval was resolved in a later conversation row. */
export function toUIParts(display: DisplayMessage, overlays: DisplayOverlays): Record<string, unknown>[] {
  const parts: Record<string, unknown>[] = [];
  for (const part of display.parts) {
    if (part.type === 'text') {
      if (part.text.trim()) parts.push({ type: 'text', text: part.text });
      continue;
    }
    if (part.type === 'file') {
      parts.push({
        type: 'file',
        mediaType: part.mediaType,
        filename: part.filename,
        ...(part.fileId != null ? { fileId: part.fileId } : {}),
        ...(part.typeLabel != null ? { typeLabel: part.typeLabel } : {}),
        ...(part.fileId == null && part.url != null ? { url: part.url } : {}),
      });
      continue;
    }
    parts.push(toolPartToUI(part, overlays));
  }
  return parts;
}
