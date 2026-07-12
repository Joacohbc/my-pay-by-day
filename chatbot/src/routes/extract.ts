import { errorJson } from '@/i18n.js';
import { Hono } from 'hono';
import type { ModelMessage } from 'ai';
import { randomUUID } from 'node:crypto';
import { requestContextFrom } from '@/context.js';
import type { ExtractionUserContentPart, FileInput } from '@/agent/extraction.js';
import { runExtractionAgent } from '@/agent/extractionAgent.js';
import { conversationMemory } from '@/memory/conversation.js';
import type { DisplayMessage, DisplayPart } from '@/memory/display.js';
import { chatTitles } from '@/memory/titles.js';
import { logger } from '@/logging/logger.js';

const extractLog = logger.child('extract');

interface ExtractBody {
  text?: string;
  files?: FileInput[];
  templateId?: number;
  chatId?: string;
}

/** The extraction user message is persisted with its display copy as content, so the display
 * representation is derived straight from those parts (file refs with fileId, inline images). */
function displayOfExtractionUserMessage(userMessage: ModelMessage): DisplayMessage {
  const content = Array.isArray(userMessage.content) ? (userMessage.content as ExtractionUserContentPart[]) : [];
  const parts: DisplayPart[] = [];
  for (const part of content) {
    if (part.type === 'text') {
      parts.push({ type: 'text', text: part.text });
    } else if (part.type === 'image') {
      parts.push({ type: 'file', mediaType: part.mediaType, url: asDataUrl(part.image, part.mediaType) });
    } else if (part.type === 'file') {
      parts.push({
        type: 'file',
        mediaType: part.mediaType,
        filename: part.filename,
        ...(part.fileId != null ? { fileId: part.fileId } : { url: asDataUrl(part.data, part.mediaType) }),
        ...(part.typeLabel != null ? { typeLabel: part.typeLabel } : {}),
      });
    }
  }
  return { role: 'user', parts };
}

function asDataUrl(data: string, mediaType: string): string {
  return data.startsWith('data:') ? data : `data:${mediaType};base64,${data}`;
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

  const chatId = body.chatId || randomUUID();

  try {
    const { draftId, summary, userMessage, responseMessages } = await runExtractionAgent(ctx, {
      text: body.text,
      files: body.files,
      templateId: body.templateId,
    });

    const displays = [displayOfExtractionUserMessage(userMessage), ...responseMessages.map(() => null)];
    conversationMemory.append(chatId, [userMessage, ...responseMessages], displays);
    void chatTitles.generateIfMissing(chatId, ctx.lang);

    return c.json({ type: 'DRAFT', chatId, draftId, summary });
  } catch (e) {
    extractLog.error('event extraction failed', { error: (e as Error).message });
    return c.json({ error: (e as Error).message }, 400);
  }
});
