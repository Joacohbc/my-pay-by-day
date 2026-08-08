import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { extractReasoningMiddleware, wrapLanguageModel, type LanguageModel, type TranscriptionModel } from 'ai';
import { config } from '@/config.js';

const provider = createOpenRouter({
  apiKey: config.openRouter.apiKey,
  baseURL: config.openRouter.baseUrl,
});

/**
 * Multimodal model (text + image + audio) for chat and the agent loop.
 *
 * minimax-m3 emits its chain-of-thought inline as `<mm:think>...</mm:think>` around the actual reply
 * instead of always using OpenRouter's separate reasoning_details field — when it does, the raw
 * closing tag leaks into the visible text (e.g. a reply literally starting with `</mm:think>`).
 * extractReasoningMiddleware strips that wrapper into a proper reasoning part before it reaches
 * streamText's text output.
 */
export function largeModel(): LanguageModel {
  return wrapLanguageModel({
    model: provider.chat(config.models.large, { usage: { include: true } }),
    middleware: extractReasoningMiddleware({ tagName: 'mm:think' }),
  });
}

/** Fast/cheap model for short text generation, extraction and summarisation. */
export function fastModel(): LanguageModel {
  return provider.chat(config.models.fast, { usage: { include: true } });
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

interface OpenRouterTranscriptionUsage {
  cost?: number;
  cost_details?: { upstream_inference_cost?: number };
}

/**
 * Restates the transcription endpoint's usage block in the camelCase shape the chat provider
 * publishes under `providerMetadata.openrouter.usage`, so one cost reader serves every flow.
 */
function transcriptionProviderMetadata(usage: OpenRouterTranscriptionUsage | undefined) {
  if (!usage) return undefined;
  const upstreamInferenceCost = usage.cost_details?.upstream_inference_cost;
  if (usage.cost == null && upstreamInferenceCost == null) return undefined;
  return {
    openrouter: {
      usage: {
        ...(usage.cost != null && { cost: usage.cost }),
        ...(upstreamInferenceCost != null && { costDetails: { upstreamInferenceCost } }),
      },
    },
  };
}

/**
 * Custom TranscriptionModelV3 adapter for OpenRouter's dedicated /audio/transcriptions endpoint,
 * since @openrouter/ai-sdk-provider only exposes a chat model factory (no transcriptionModel support).
 * OpenRouter's whisper endpoint returns the transcript and, when it accounts for it, a usage block —
 * never timings, so segments/language/durationInSeconds stay empty. That is a permanent limitation
 * of the underlying provider, not a stopgap.
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

      const { text, usage } = (await response.json()) as { text: string; usage?: OpenRouterTranscriptionUsage };
      const providerMetadata = transcriptionProviderMetadata(usage);

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
        ...(providerMetadata && { providerMetadata }),
      };
    },
  };
}
