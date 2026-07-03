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
audioRoute.post('/transcribe', async (c) => {
  requestContextFrom(c);
  const body = await c.req.parseBody();
  const file = body['audio'];
  if (!(file instanceof File)) {
    return c.json({ error: 'audio file is required' }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const result = await transcribe({ model: audioTranscriptionModel(), audio: bytes });
    return c.json({ transcription: result.text });
  } catch (e) {
    audioLog.error('audio transcription failed', { error: (e as Error).message });
    return c.json({ error: (e as Error).message }, 500);
  }
});
