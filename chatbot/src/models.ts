import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel, TranscriptionModel } from 'ai';
import { config } from '@/config.js';

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

const AUDIO_FORMAT_BY_MEDIA_TYPE: Record<string, string> = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/aac': 'aac',
};

/**
 * Custom TranscriptionModelV3 adapter for OpenRouter's dedicated /audio/transcriptions endpoint,
 * since @openrouter/ai-sdk-provider only exposes a chat model factory (no transcriptionModel support).
 * OpenRouter's whisper endpoint only returns plain text, so segments/language/durationInSeconds are
 * always empty — a permanent limitation of the underlying provider, not a stopgap.
 */
export function audioTranscriptionModel(): TranscriptionModel {
  return {
    specificationVersion: 'v3' as const,
    provider: 'openrouter',
    modelId: config.models.audio,
    async doGenerate({
      audio,
      mediaType,
      abortSignal,
      headers,
    }: {
      audio: Uint8Array | string;
      mediaType: string;
      abortSignal?: AbortSignal;
      headers?: Record<string, string | undefined>;
    }) {
      const format = AUDIO_FORMAT_BY_MEDIA_TYPE[mediaType] ?? 'wav';
      const base64 = typeof audio === 'string' ? audio : Buffer.from(audio).toString('base64');

      const response = await fetch(`${config.openRouter.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.openRouter.apiKey}`,
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          model: config.models.audio,
          input_audio: { data: base64, format },
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`OpenRouter transcription request failed (${response.status}): ${await response.text()}`);
      }

      const { text } = (await response.json()) as { text: string };

      return {
        text: text.trim(),
        segments: [],
        language: undefined,
        durationInSeconds: undefined,
        warnings: [],
        response: {
          timestamp: new Date(),
          modelId: config.models.audio,
        },
      };
    },
  };
}
