import { Hono } from 'hono';
import { requestContextFrom } from '@/context.js';
import {
  FORM_PATCH_ENTITY_TYPES,
  generateFormPatch,
  type FormPatchEntityType,
  type FormPatchFileInput,
  type FormPatchTurn,
} from '@/agent/formPatch.js';
import { logger } from '@/logging/logger.js';

const formChatLog = logger.child('formChat');

interface FormChatBody {
  entityType?: FormPatchEntityType;
  currentValues?: Record<string, unknown>;
  conversation?: FormPatchTurn[];
  message?: string;
  files?: FormPatchFileInput[];
}

export const formChatRoute = new Hono();

formChatRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as FormChatBody;

  if (!body.entityType || !FORM_PATCH_ENTITY_TYPES.includes(body.entityType)) {
    return c.json({ error: 'invalid entityType' }, 400);
  }
  if (!body.message?.trim() && !body.files?.length) {
    return c.json({ error: 'message or files required' }, 400);
  }

  try {
    const result = await generateFormPatch(ctx, {
      entityType: body.entityType,
      currentValues: body.currentValues ?? {},
      conversation: body.conversation ?? [],
      message: body.message ?? '',
      files: body.files,
    });
    return c.json(result);
  } catch (e) {
    formChatLog.error('form chat failed', { error: (e as Error).message, entityType: body.entityType });
    return c.json({ error: (e as Error).message }, 400);
  }
});
