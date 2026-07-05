import { errorJson } from '@/i18n.js';
import { experimental_transcribe as transcribe } from 'ai';
import { Hono } from 'hono';
import { requestContextFrom } from '@/context.js';
import { logger } from '@/logging/logger.js';
import { audioTranscriptionModel } from '@/models.js';

const audioLog = logger.child('audio');

export const audioRoute = new Hono();

/**
 * Transcribes audio via OpenRouter's dedicated /audio/transcriptions endpoint,
 * using a speech-to-text model kept separate from the chat/agent model.
 * Accepts multipart form-data with an `audio` file, matching the previous Java contract.
 */
async function transcribeWithRetry(
  audioBytes: Uint8Array,
  maxAttempts = 3,
  delayMs = 1000,
): Promise<string> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let attempt = 1;
  while (attempt < maxAttempts) {
    try {
      const result = await transcribe({ model: audioTranscriptionModel(), audio: audioBytes });
      return result.text;
    } catch (error) {
      audioLog.warn('audio transcription attempt failed, retrying', {
        attempt,
        error: (error as Error).message,
      });
      await sleep(delayMs * attempt);
      attempt++;
    }
  }
  const finalResult = await transcribe({ model: audioTranscriptionModel(), audio: audioBytes });
  return finalResult.text;
}

audioRoute.post('/transcribe', async (c) => {
  requestContextFrom(c);
  const body = await c.req.parseBody();
  const file = body['audio'];
  if (!(file instanceof File)) {
    return errorJson(c, 'error.audio_required', 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const text = await transcribeWithRetry(bytes);
    return c.json({ transcription: text });
  } catch (error) {
    audioLog.error('audio transcription failed after all attempts', { error: (error as Error).message });
    return c.json({ error: (error as Error).message }, 500);
  }
});
