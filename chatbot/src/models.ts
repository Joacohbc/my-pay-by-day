import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import { config } from './config.js';

const provider = createOpenRouter({
  apiKey: config.openRouter.apiKey,
  baseURL: config.openRouter.baseUrl,
});

/** Multimodal model (text + image + audio) for chat and the agent loop. */
export function largeModel(): LanguageModel {
  return provider.chat(config.models.large);
}

/** Fast/cheap model for short text generation, extraction and summarisation. */
export function fastModel(): LanguageModel {
  return provider.chat(config.models.fast);
}
