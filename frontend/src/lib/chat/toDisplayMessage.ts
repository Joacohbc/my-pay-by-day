import type { FileUIPart, UIMessage } from 'ai';
import type { ChatMessage, ChatMessagePart, ChatToolCall } from '@/store/chatStore';
import { filesService } from '@/services/files.service';

type FileRefPart = FileUIPart & { fileId?: number; typeLabel?: string };

const PRESERVED_STATES = new Set(['approval-requested', 'approval-responded']);

type ToolLikeUIPart = UIMessage['parts'][number] & {
  toolName?: string;
  state: string;
  output?: unknown;
  input?: unknown;
  toolCallId?: string;
  approval?: { id: string; approved?: boolean; reason?: string };
};

function isToolLikePart(part: UIMessage['parts'][number]): part is ToolLikeUIPart {
  return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
}

function toChatToolCall(part: ToolLikeUIPart, isFinished: boolean): ChatToolCall {
  const name = part.toolName || part.type.replace(/^tool-/, '');
  return {
    name,
    state: isFinished && !PRESERVED_STATES.has(part.state) ? 'result' : part.state,
    output: part.output,
    // AI SDK v5 UIMessage tool parts carry the tool call's arguments as `input`, not `args`
    // (see chatbot/src/routes/chat.ts's GET /:chatId, which rebuilds parts with `input: part.input`).
    args: part.input,
    toolCallId: part.toolCallId,
    approval: part.approval,
  };
}

/** Some models leak their tool-call syntax as plain text (e.g. `<tool_call><function=askUser…`)
 * alongside the real, native tool call. The native call already renders as a tool part, so the
 * leaked markup is pure noise and is stripped from the displayed text. */
const LEAKED_TOOL_CALL_MARKUP = /<tool_call>[\s\S]*?(?:<\/tool_call>|$)/g;

function stripLeakedToolCallMarkup(text: string): string {
  return text.replace(LEAKED_TOOL_CALL_MARKUP, '');
}

export function partsOf(message: UIMessage, isFinished: boolean): ChatMessagePart[] {
  const parts: ChatMessagePart[] = [];
  for (const part of message.parts) {
    if (part.type === 'text') {
      const text = message.role === 'assistant' ? stripLeakedToolCallMarkup(part.text) : part.text;
      if (text.trim()) parts.push({ type: 'text', text });
      continue;
    }
    if (isToolLikePart(part)) {
      parts.push({ type: 'tool', call: toChatToolCall(part, isFinished) });
    }
  }
  return parts;
}

export function textOf(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function imageUrlsOf(message: UIMessage): string[] {
  return message.parts
    .filter((part): part is FileRefPart => part.type === 'file' && (part.mediaType ?? '').startsWith('image/'))
    .map((part) => part.url ?? (part.fileId != null ? filesService.getContentUrl(part.fileId) : undefined))
    .filter((url): url is string => url != null);
}

export function attachmentsOf(message: UIMessage): { name: string; type: string; fileId?: number; typeLabel?: string }[] {
  return message.parts
    .filter((part): part is FileRefPart => part.type === 'file' && !(part.mediaType ?? '').startsWith('image/'))
    .map((part) => {
      // @ts-expect-error - FileUIPart might have name or filename depending on version
      const name = part.filename || part.name || 'File';
      return {
        name,
        type: part.mediaType ?? 'application/octet-stream',
        fileId: part.fileId,
        typeLabel: part.typeLabel,
      };
    });
}

export function stoppedByStepLimitOf(message: UIMessage): boolean {
  return (message.metadata as { stoppedByStepLimit?: boolean } | undefined)?.stoppedByStepLimit ?? false;
}

export function toDisplayMessage(message: UIMessage, isFinished: boolean): ChatMessage {
  const parts = partsOf(message, isFinished);
  const content = parts
    .filter((part): part is Extract<ChatMessagePart, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('');
  const toolCalls = parts
    .filter((part): part is Extract<ChatMessagePart, { type: 'tool' }> => part.type === 'tool')
    .map((part) => part.call);

  return {
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    parts,
    content,
    toolCalls,
    timestamp: new Date().toISOString(),
    stoppedByStepLimit: stoppedByStepLimitOf(message),
  };
}
