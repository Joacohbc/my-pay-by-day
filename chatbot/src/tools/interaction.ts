import { tool, type ModelMessage, type ToolCallOptions } from 'ai';
import { z } from 'zod';
import { stringifiedArray } from '@/bot/dto.js';
import type { KindedToolSet } from '@/tools/types.js';

const askUserInputSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('OPEN'), question: z.string() }),
  z.object({ mode: z.literal('CHOICE'), question: z.string(), options: stringifiedArray(z.array(z.string()).min(2).max(5)) }),
  z.object({ mode: z.literal('YES_NO'), question: z.string() }),
]);

/**
 * Reads the human's answer for this exact tool call out of the messages the model was given.
 *
 * The approval flow only ever carries the answer on a `tool-approval-response`'s `reason` field,
 * keyed by `approvalId` — not `toolCallId`. `execute()` is re-invoked by the AI SDK once the approval
 * is resolved, receiving the SAME `messages` history the model sees, so this is the one place that
 * reliably has both the original `tool-approval-request` (toolCallId -> approvalId) and the
 * `tool-approval-response` (approvalId -> reason) already resolved and available together.
 */
function findAnswer(messages: ModelMessage[], toolCallId: string): string | undefined {
  let approvalId: string | undefined;
  for (const message of messages) {
    if (message.role !== 'assistant' || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type === 'tool-approval-request' && part.toolCallId === toolCallId) approvalId = part.approvalId;
    }
  }
  if (!approvalId) return undefined;

  for (const message of messages) {
    if (message.role !== 'tool' || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type === 'tool-approval-response' && part.approvalId === approvalId) return part.reason;
    }
  }
  return undefined;
}

/**
 * Interactive-chat-only tool for pausing to ask the human a structured clarifying question.
 * Kinded ASK_USER, gated for approval the same way as DRAFT_CONFIRM/WRITE (see chat.ts's
 * CHAT_APPROVAL_KINDS).
 */
export function buildInteractionTools(): KindedToolSet {
  return {
    askUser: {
      kind: 'ASK_USER',
      tool: tool({
        description:
          'Ask the user a clarifying question before continuing, and wait for their answer instead of guessing. ' +
          'Use mode "OPEN" for free text, "CHOICE" with 2-5 short options for a multiple-choice question, or ' +
          '"YES_NO" for a yes/no question. ' +
          'For "CHOICE", the UI always shows a free-text field next to the options, so the user can already type ' +
          'their own answer at any time — never add an option like "Other" or "Enter your own" to the options list.',
        inputSchema: askUserInputSchema,
        execute: async (input, options: ToolCallOptions) => ({
          question: input.question,
          answer: findAnswer(options.messages, options.toolCallId),
        }),
      }),
    },
  };
}
