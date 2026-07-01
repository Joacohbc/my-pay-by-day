import { Hono } from 'hono';
import { BackendClient } from '@/backend/client.js';
import { requestContextFrom } from '@/context.js';
import { extractFinanceEvent, toDraftPayload, type ImageInput } from '@/agent/extraction.js';

interface ExtractBody {
  text?: string;
  images?: ImageInput[];
  templateId?: number;
  createDraft?: boolean;
}

export const extractRoute = new Hono();

extractRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as ExtractBody;
  if (!body.text && (!body.images || body.images.length === 0)) {
    return c.json({ error: 'text or images are required' }, 400);
  }

  try {
    const event = await extractFinanceEvent(ctx, {
      text: body.text,
      images: body.images,
      templateId: body.templateId,
    });

    if (body.createDraft === false) {
      return c.json({ type: 'EXTRACTION', event });
    }

    const draft = await new BackendClient(ctx).post('/drafts/finance-events', toDraftPayload(event));
    return c.json({ type: 'DRAFT', event, draft });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

interface FromImageBody {
  images?: ImageInput[];
  templateId?: number;
  text?: string;
}

/** Mounted at /ai/events — returns structured event JSON for the EventForm (no draft created). */
export const eventsRoute = new Hono();

eventsRoute.post('/from-image', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as FromImageBody;
  if (!body.images || body.images.length === 0) {
    return c.json({ error: 'images are required' }, 400);
  }

  try {
    const event = await extractFinanceEvent(ctx, {
      text: body.text,
      images: body.images,
      templateId: body.templateId,
    });
    return c.json({ event });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});
