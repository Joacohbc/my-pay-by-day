import { generateText } from 'ai';
import { languageName } from '@/context.js';
import { fastModel } from '@/models.js';
import { conversationMemory, textOf } from '@/memory/conversation.js';
import { logger } from '@/logging/logger.js';
import { logLlmError, logLlmGeneration, logLlmRun } from '@/logging/llmUsage.js';
import { config } from '@/config.js';

const titleLog = logger.child('chat-title');
const MAX_TITLE_LENGTH = 60;

/** Generates a short, human-readable title for a conversation using the fast model (replaces the raw first-message preview). */
export const chatTitles = {
  /** Generates and stores a title for the chat if it does not already have one. Safe to call after every turn. */
  async generateIfMissing(chatId: string, lang: string): Promise<void> {
    if (conversationMemory.getTitle(chatId)) return;

    const messages = conversationMemory.load(chatId);
    if (messages.length === 0) return;

    const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${textOf(m)}`).join('\n');
    const startedAt = performance.now();
    try {
      const { text, response, steps } = await generateText({
        model: fastModel(),
        prompt:
          `Write a short title (max 6 words, no quotes, no trailing punctuation) in ${languageName(lang)} ` +
          `that summarises what this finance-assistant conversation is about:\n\n${transcript}`,
        onStepFinish: (step) => logLlmGeneration('title', step.response.modelId, step, { chatId }),
      });
      const durationMs = Math.round(performance.now() - startedAt);
      logLlmRun('title', response.modelId, durationMs, steps.length, { chatId });
      const title = text.trim().slice(0, MAX_TITLE_LENGTH);
      if (title) conversationMemory.setTitle(chatId, title);
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      titleLog.warn('title generation failed', { chatId, error: String(error) });
      logLlmError('title', config.models.fast, durationMs, error, { chatId });
    }
  },
};
