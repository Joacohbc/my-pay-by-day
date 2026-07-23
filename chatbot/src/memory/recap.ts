import { generateText } from 'ai';
import { config } from '@/config.js';
import { languageName } from '@/context.js';
import { fastModel } from '@/models.js';
import { conversationMemory, textOf } from '@/memory/conversation.js';
import { logger } from '@/logging/logger.js';
import { costOf, logLlmError, logLlmUsage } from '@/logging/llmUsage.js';

const recapLog = logger.child('chat-recap');

/** Upper bound on the transcript fed to the fast model — a runaway chat is tail-clipped to its most
 * recent slice, which is the part most likely to be referenced later. */
const MAX_TRANSCRIPT_CHARS = 24_000;
const MAX_RECAP_CHARS = 2_000;

export interface Recap {
  recap: string;
  messageCount: number;
}

function transcriptOf(chatId: string): { transcript: string; messageCount: number } {
  const messages = conversationMemory.load(chatId);
  const turns = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({ role: message.role, text: textOf(message).trim() }))
    .filter((turn) => turn.text.length > 0)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`);
  const full = turns.join('\n');
  const transcript = full.length > MAX_TRANSCRIPT_CHARS ? full.slice(full.length - MAX_TRANSCRIPT_CHARS) : full;
  return { transcript, messageCount: messages.length };
}

async function summarize(transcript: string, lang: string): Promise<string> {
  const startedAt = performance.now();
  try {
    const { text, usage, response, providerMetadata } = await generateText({
      model: fastModel(),
      prompt:
        `Summarise this finance-assistant conversation in ${languageName(lang)} as a compact recap another ` +
        `assistant can rely on later, without re-reading the whole thing. Preserve the concrete facts: what the ` +
        `user wanted, decisions made, key entities (accounts/nodes, categories, tags), amounts, dates, event/draft ` +
        `IDs, and anything still pending or unresolved. Omit small talk. Return only the recap, a few short ` +
        `sentences or bullet points.\n\n${transcript}`,
    });
    const durationMs = Math.round(performance.now() - startedAt);
    logLlmUsage('recap', response.modelId, durationMs, usage, costOf(providerMetadata));
    return text.trim().slice(0, MAX_RECAP_CHARS);
  } catch (error) {
    logLlmError('recap', config.models.fast, Math.round(performance.now() - startedAt), error);
    throw error;
  }
}

/**
 * Reusable, self-caching conversation compaction primitive. Returns a fast-model recap of a whole
 * conversation, generated once and cached; it is only regenerated when new messages have arrived
 * since the cached version (staleness keyed on message count). Callers get a small, bounded summary
 * instead of a full transcript, so reading another chat costs a near-constant amount of context.
 */
export const conversationRecap = {
  async getOrGenerate(chatId: string, lang: string): Promise<Recap | null> {
    const { transcript, messageCount } = transcriptOf(chatId);
    if (messageCount === 0 || transcript.length === 0) return null;

    const cached = conversationMemory.getRecap(chatId);
    if (cached && cached.upToCount === messageCount) return { recap: cached.recap, messageCount };

    try {
      const recap = await summarize(transcript, lang);
      conversationMemory.setRecap(chatId, recap, messageCount);
      return { recap, messageCount };
    } catch (error) {
      recapLog.warn('recap generation failed, falling back', { chatId, error: String(error) });
      if (cached) return { recap: cached.recap, messageCount: cached.upToCount };
      return { recap: transcript.slice(0, MAX_RECAP_CHARS), messageCount };
    }
  },
};
