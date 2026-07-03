import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import type { ModelMessage } from 'ai';
import { createApiClient, unwrap } from '@/backend/client.js';
import { requestContextFrom } from '@/context.js';
import { extractFinanceEvent, toDraftPayload, type ExtractedEvent, type FileInput } from '@/agent/extraction.js';
import { conversationMemory } from '@/memory/conversation.js';
import { chatTitles } from '@/memory/titles.js';
import { logger } from '@/logging/logger.js';

const extractLog = logger.child('extract');

interface ExtractBody {
  text?: string;
  files?: FileInput[];
  templateId?: number;
  createDraft?: boolean;
  chatId?: string;
}

function createDraftToolInput(event: ExtractedEvent) {
  return {
    name: event.name,
    description: event.description,
    type: event.type,
    amount: event.amount,
    sourceNodeId: event.sourceNodeId ?? undefined,
    destNodeId: event.destinationNodeId ?? undefined,
    categoryId: event.categoryId ?? undefined,
    tagIds: event.tagIds,
    date: event.transactionDate ?? undefined,
  };
}

export const extractRoute = new Hono();

extractRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as ExtractBody;
  if (!body.text && (!body.files || body.files.length === 0)) {
    return c.json({ error: 'text or files are required' }, 400);
  }

  try {
    const event = await extractFinanceEvent(ctx, {
      text: body.text,
      files: body.files,
      templateId: body.templateId,
    });

    if (body.createDraft === false) {
      return c.json({ type: 'EXTRACTION', event });
    }

    const draft = await unwrap(createApiClient(ctx).POST('/drafts/finance-events', { body: toDraftPayload(event, ctx.timezone) }));

    if (body.chatId) {
      const toolCallId = `extract-${randomUUID()}`;
      const messages: ModelMessage[] = [
        { role: 'user', content: body.text ?? '(file)' },
        {
          role: 'assistant',
          content: [
            { type: 'tool-call', toolCallId, toolName: 'createDraft', input: createDraftToolInput(event) },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId,
              toolName: 'createDraft',
              output: {
                type: 'json',
                value: { ok: true, draftId: draft.id, originalEventId: draft.originalEntityId ?? undefined },
              },
            },
          ],
        },
      ];
      conversationMemory.append(body.chatId, messages);
      void chatTitles.generateIfMissing(body.chatId, ctx.lang);
    }

    return c.json({ type: 'DRAFT', event, draft });
  } catch (e) {
    extractLog.error('event extraction failed', { error: (e as Error).message });
    return c.json({ error: (e as Error).message }, 400);
  }
});

interface FromImageBody {
  files?: FileInput[];
  templateId?: number;
  text?: string;
}

/** Mounted at /ai/events — returns structured event JSON for the EventForm (no draft created). */
export const eventsRoute = new Hono();

eventsRoute.post('/from-image', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as FromImageBody;
  if (!body.files || body.files.length === 0) {
    return c.json({ error: 'files are required' }, 400);
  }

  try {
    const event = await extractFinanceEvent(ctx, {
      text: body.text,
      files: body.files,
      templateId: body.templateId,
    });
    return c.json({ event });
  } catch (e) {
    extractLog.error('event extraction from file failed', { error: (e as Error).message });
    return c.json({ error: (e as Error).message }, 400);
  }
});
