import { Hono } from 'hono';
import { config } from '@/config.js';
import { requestContextFrom } from '@/context.js';
import { logger } from '@/logging/logger.js';

const audioLog = logger.child('audio');

export const audioRoute = new Hono();

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
 * Transcribes audio via OpenRouter's dedicated /audio/transcriptions endpoint,
 * using a speech-to-text model kept separate from the chat/agent model.
 * Accepts multipart form-data with an `audio` file, matching the previous Java contract.
 */
audioRoute.post('/transcribe', async (c) => {
  requestContextFrom(c);
  const body = await c.req.parseBody();
  const file = body['audio'];
  if (!(file instanceof File)) {
    return c.json({ error: 'audio file is required' }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = file.type && file.type !== '' ? file.type : 'audio/wav';
  const format = AUDIO_FORMAT_BY_MEDIA_TYPE[mediaType] ?? 'wav';

  try {
    const response = await fetch(`${config.openRouter.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.models.audio,
        input_audio: { data: Buffer.from(bytes).toString('base64'), format },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter transcription request failed (${response.status}): ${await response.text()}`);
    }

    const { text } = (await response.json()) as { text: string };
    return c.json({ transcription: text.trim() });
  } catch (e) {
    audioLog.error('audio transcription failed', { error: (e as Error).message });
    return c.json({ error: (e as Error).message }, 500);
  }
});
