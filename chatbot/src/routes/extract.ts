import { Hono } from 'hono';
import { createApiClient, unwrap } from '@/backend/client.js';
import { requestContextFrom } from '@/context.js';
import { extractFinanceEvent, toDraftPayload, type ImageInput } from '@/agent/extraction.js';
import { logger } from '@/logging/logger.js';

const extractLog = logger.child('extract');

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

    const draft = await unwrap(createApiClient(ctx).POST('/drafts/finance-events', { body: toDraftPayload(event, ctx.timezone) }));
    return c.json({ type: 'DRAFT', event, draft });
  } catch (e) {
    extractLog.error('event extraction failed', { error: (e as Error).message });
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
    extractLog.error('event extraction from image failed', { error: (e as Error).message });
    return c.json({ error: (e as Error).message }, 400);
  }
});
