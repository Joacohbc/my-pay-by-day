import { errorJson } from '@/i18n.js';
import { Hono } from 'hono';
import { requestContextFrom } from '@/context.js';
import type { FileInput } from '@/agent/extraction.js';
import { runExtractionAgent } from '@/agent/extractionAgent.js';
import { conversationMemory } from '@/memory/conversation.js';
import { chatTitles } from '@/memory/titles.js';
import { logger } from '@/logging/logger.js';

const extractLog = logger.child('extract');

interface ExtractBody {
  text?: string;
  files?: FileInput[];
  templateId?: number;
  chatId?: string;
}

export const extractRoute = new Hono();

/** Always stages a new standalone draft via the extraction agent (runExtractionAgent) — it never returns
 * bare structured JSON, since the whole point of this route is "input in, draft out", even incomplete. */
extractRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as ExtractBody;
  if (!body.text && (!body.files || body.files.length === 0)) {
    return errorJson(c, 'error.text_files_required', 400);
  }

  try {
    const { draftId, summary, userMessage, responseMessages } = await runExtractionAgent(ctx, {
      text: body.text,
      files: body.files,
      templateId: body.templateId,
    });

    if (body.chatId) {
      conversationMemory.append(body.chatId, [userMessage, ...responseMessages]);
      void chatTitles.generateIfMissing(body.chatId, ctx.lang);
    }

    return c.json({ type: 'DRAFT', draftId, summary });
  } catch (e) {
    extractLog.error('event extraction failed', { error: (e as Error).message });
    return c.json({ error: (e as Error).message }, 400);
  }
});
