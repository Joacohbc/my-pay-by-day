import { Hono } from 'hono';
import { convertFileToMarkdown } from '@/files/markitdown.js';
import { logger } from '@/logging/logger.js';

const filesLog = logger.child('files');

interface ToMarkdownBody {
  data?: string;
  mediaType?: string;
  filename?: string;
}

export const filesRoute = new Hono();

filesRoute.post('/markdown', async (c) => {
  const body = (await c.req.json()) as ToMarkdownBody;
  if (!body.data || !body.mediaType) {
    return c.json({ error: 'data and mediaType are required' }, 400);
  }

  const markdown = await convertFileToMarkdown({
    data: body.data,
    mediaType: body.mediaType,
    filename: body.filename,
  });

  if (markdown == null) {
    filesLog.info('markdown conversion unavailable', { filename: body.filename, mediaType: body.mediaType });
    return c.json({ error: 'conversion unavailable' }, 422);
  }

  return c.json({ markdown });
});
