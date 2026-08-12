import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createVertex } from '@ai-sdk/google-vertex';
import { extractReasoningMiddleware, wrapLanguageModel, type LanguageModel, type TranscriptionModel } from 'ai';
import { config } from '@/config.js';

const openRouter = createOpenRouter({
  apiKey: config.openRouter.apiKey,
  baseURL: config.openRouter.baseUrl,
});

const vertex = createVertex({
  project: config.vertex.project,
  location: config.vertex.location,
  ...(config.vertex.serviceAccountJson && {
    googleAuthOptions: { credentials: JSON.parse(config.vertex.serviceAccountJson) },
  }),
});

const isVertex = config.ai.provider === 'vertex';

function openRouterChatModel(modelId: string) {
  return openRouter.chat(modelId, { usage: { include: true } });
}

function vertexChatModel(modelId: string) {
  return vertex(modelId);
}

/**
 * Multimodal model (text + image + audio) for chat and the agent loop.
 *
 * minimax-m3 emits its chain-of-thought inline as `<mm:think>...</mm:think>` around the actual reply
 * instead of always using OpenRouter's separate reasoning_details field — when it does, the raw
 * closing tag leaks into the visible text (e.g. a reply literally starting with `</mm:think>`).
 * extractReasoningMiddleware strips that wrapper into a proper reasoning part before it reaches
 * streamText's text output. Vertex's Gemini models never emit this tag, so the middleware is scoped
 * to OpenRouter rather than added as a harmless no-op layer on every provider.
 */
export function largeModel(): LanguageModel {
  if (isVertex) return vertexChatModel(config.models.large);
  return wrapLanguageModel({
    model: openRouterChatModel(config.models.large),
    middleware: extractReasoningMiddleware({ tagName: 'mm:think' }),
  });
}

/** Fast/cheap model for short text generation, extraction and summarisation. */
export function fastModel(): LanguageModel {
  return isVertex ? vertexChatModel(config.models.fast) : openRouterChatModel(config.models.fast);
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
function openRouterAudioTranscriptionModel(): TranscriptionModel {
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

/**
 * Speech-to-text model for the audio routes. On OpenRouter this is the custom adapter above;
 * on Vertex it is Google Cloud Speech-to-Text (Chirp), reached through `config.models.audio`
 * holding a Chirp model id (e.g. `chirp_2`, `chirp_3`) instead of an OpenRouter model slug.
 */
export function audioTranscriptionModel(): TranscriptionModel {
  return isVertex ? vertex.transcription(config.models.audio) : openRouterAudioTranscriptionModel();
}
