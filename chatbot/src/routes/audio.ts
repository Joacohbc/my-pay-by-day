import { generateText } from 'ai';
import { Hono } from 'hono';
import { requestContextFrom } from '../context.js';
import { largeModel } from '../models.js';

export const audioRoute = new Hono();

/**
 * Transcribes audio using the large multimodal model natively (no separate speech model).
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

  try {
    const { text } = await generateText({
      model: largeModel(),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcribe this audio verbatim. Return only the transcription text, with no commentary.',
            },
            { type: 'file', data: bytes, mediaType },
          ],
        },
      ],
    });
    return c.json({ transcription: text.trim() });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});
