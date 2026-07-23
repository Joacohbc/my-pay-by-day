const RANDOM_SUFFIX_LENGTH = 8;

/**
 * Correlation ID for a chat request. Unlike the plain UUID used for regular API calls, it is always
 * prefixed with the chat it belongs to (and the message that triggered it), so a whole conversation
 * — including the background agent tasks that inherit the ID — can be traced from a single
 * `X-Request-Id` prefix filter.
 *
 * @param chatId conversation the request belongs to; always the first segment.
 * @param messageId message being sent, when the caller knows it.
 */
export function buildChatRequestId(chatId: string, messageId?: string): string {
  const randomSuffix = crypto.randomUUID().slice(0, RANDOM_SUFFIX_LENGTH);
  return [chatId, messageId, randomSuffix].filter(Boolean).join('-');
}
