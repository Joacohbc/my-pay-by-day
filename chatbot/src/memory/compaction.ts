import { generateText } from 'ai';
import { config } from '../config.js';
import { languageName } from '../context.js';
import { fastModel } from '../models.js';
import { conversationMemory, textOf } from './conversation.js';

const COMPACTION_THRESHOLD = 0.9;

/**
 * Summarises an over-long conversation into a single system message so the chat/agent
 * keeps context without exceeding the message window (replaces the Java compaction logic).
 */
export async function compactIfNeeded(chatId: string, lang: string): Promise<void> {
  const messages = conversationMemory.load(chatId);
  if (messages.length < config.agent.maxChatMessages * COMPACTION_THRESHOLD) return;

  const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${textOf(m)}`).join('\n');
  const { text } = await generateText({
    model: fastModel(),
    prompt:
      `Summarise the following finance-assistant conversation in ${languageName(lang)}. ` +
      `Preserve key facts, decisions, IDs, amounts, and any pending drafts or follow-ups. Be concise.\n\n${transcript}`,
  });

  conversationMemory.replace(chatId, [
    {
      role: 'system',
      content: `SUMMARY OF PREVIOUS CONTEXT (memory was compacted to save space):\n${text}`,
    },
  ]);
}
