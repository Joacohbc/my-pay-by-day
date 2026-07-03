import { generateText, type ModelMessage } from 'ai';
import { config } from '@/config.js';
import { languageName } from '@/context.js';
import { fastModel } from '@/models.js';
import { conversationMemory, textOf, type SequencedMessage } from '@/memory/conversation.js';

const COMPACTION_THRESHOLD = 0.9;

function keepRecentCount(): number {
  return Math.max(1, Math.floor(config.agent.maxChatMessages / 2));
}

function summaryMessage(summary: string): ModelMessage {
  return {
    role: 'system',
    content: `SUMMARY OF EARLIER CONVERSATION (older messages were compacted to save context space):\n${summary}`,
  };
}

/**
 * Assembles the message window sent to the model: the running summary (if any) followed by the
 * messages after the summarised boundary. Never mutates stored history, so the full transcript
 * stays available for the frontend.
 */
export function buildModelContext(chatId: string): ModelMessage[] {
  const summary = conversationMemory.getSummary(chatId);
  if (!summary) return conversationMemory.load(chatId);
  const tail = conversationMemory.loadAfterSequence(chatId, summary.upToSequence).map((m) => m.message);
  return [summaryMessage(summary.summary), ...tail];
}

/**
 * Picks the sequence up to which (inclusive) the live window can be summarised while keeping at
 * least `keepRecent` recent messages, cutting on a `user` turn boundary so the retained tail never
 * begins with an orphaned tool result. Returns null when no earlier user boundary exists yet.
 */
function pickSummariseBoundary(live: SequencedMessage[], keepRecent: number): number | null {
  let tailLength = 0;
  for (let i = live.length - 1; i > 0; i--) {
    tailLength++;
    if (live[i].message.role === 'user' && tailLength >= keepRecent) {
      return live[i - 1].sequence;
    }
  }
  return null;
}

/**
 * Compacts an over-long conversation without deleting history: it summarises the oldest part of the
 * live window into a persisted checkpoint (`conversation.summary` + boundary sequence) that
 * `buildModelContext` prepends. The full transcript stays in `conversation_message`, so the frontend
 * still shows the complete chat.
 */
export async function compactIfNeeded(chatId: string, lang: string): Promise<void> {
  const existing = conversationMemory.getSummary(chatId);
  const boundarySequence = existing?.upToSequence ?? -1;
  const live = conversationMemory.loadAfterSequence(chatId, boundarySequence);
  if (live.length < config.agent.maxChatMessages * COMPACTION_THRESHOLD) return;

  const newBoundary = pickSummariseBoundary(live, keepRecentCount());
  if (newBoundary === null) return;

  const toSummarize = live.filter((m) => m.sequence <= newBoundary);
  if (toSummarize.length === 0) return;

  const transcript = toSummarize.map((m) => `${m.message.role.toUpperCase()}: ${textOf(m.message)}`).join('\n');
  const priorSummary = existing ? `SUMMARY SO FAR:\n${existing.summary}\n\nNEW MESSAGES TO FOLD IN:\n` : '';
  const { text } = await generateText({
    model: fastModel(),
    prompt:
      `You maintain a running summary of a finance-assistant conversation, written in ${languageName(lang)}. ` +
      `Update it to incorporate the new messages, preserving key facts, decisions, IDs, amounts, and any pending ` +
      `drafts or follow-ups. Return only the updated summary.\n\n${priorSummary}${transcript}`,
  });

  conversationMemory.setSummary(chatId, text, newBoundary);
}
