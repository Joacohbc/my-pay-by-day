import type { ModelMessage } from 'ai';

const ENVELOPE_TAGS = ['tool_call', 'tool_calls', 'tool_use', 'function_calls', 'function', 'invoke', 'tool'];

function leakPattern(toolNames: readonly string[]): RegExp {
  const tags = [...ENVELOPE_TAGS, ...toolNames].map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`<(${tags.join('|')})\\b[^>]*>[\\s\\S]*?(?:</\\1\\s*>|$)`, 'gi');
}

function sanitizeText(text: string, pattern: RegExp): string {
  pattern.lastIndex = 0;
  return text.replace(pattern, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Removes tool-call markup that a model leaked into its assistant text (e.g. `<askUser>…</askUser>` or
 * `<tool_call>…`) before it is persisted, so the leak never re-enters the model's own context on the
 * next turn — which is what makes some models keep repeating the pattern. The native tool call lives in
 * separate `tool-call` content parts and is never touched. Mutates the assistant messages in place.
 */
export function sanitizeLeakedToolMarkup(messages: readonly ModelMessage[], toolNames: readonly string[]): void {
  const pattern = leakPattern(toolNames);
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    if (typeof message.content === 'string') {
      message.content = sanitizeText(message.content, pattern);
      continue;
    }
    if (!Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type === 'text') part.text = sanitizeText(part.text, pattern);
    }
  }
}
