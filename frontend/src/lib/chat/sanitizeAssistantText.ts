import { CHAT_TOOL_MANIFEST } from '@/lib/chat/toolManifest.generated';

/**
 * Some models emit their tool call as plain text in the reply — either wrapped in a generic envelope
 * (`<tool_call>…</tool_call>`, `<function=askUser>…`, `<invoke name="askUser">…`) or as a pseudo-XML
 * element whose tag is the tool's own name (`<askUser><question>…</question></askUser>`). The real,
 * native tool call already renders as its own tool part, so this leaked markup is pure noise that must
 * be removed from the assistant text shown to the user.
 *
 * The tag set is anchored to the actual tool names (from the generated manifest) plus the known
 * envelope tags, so ordinary prose and markdown are left untouched. Both properly closed and
 * model-truncated (missing closing tag) leaks are handled.
 */
const ENVELOPE_TAGS = ['tool_call', 'tool_calls', 'tool_use', 'function_calls', 'function', 'invoke', 'tool'];

const LEAK_TAGS = [...ENVELOPE_TAGS, ...Object.keys(CHAT_TOOL_MANIFEST)];

const LEAKED_TOOL_MARKUP = new RegExp(`<(${LEAK_TAGS.join('|')})\\b[^>]*>[\\s\\S]*?(?:</\\1\\s*>|$)`, 'gi');

export function sanitizeAssistantText(text: string): string {
  return text.replace(LEAKED_TOOL_MARKUP, '').replace(/\n{3,}/g, '\n\n').trim();
}
