import { Hono } from 'hono';
import { requestContextFrom } from '@/context.js';
import {
  FORM_PATCH_ENTITY_TYPES,
  streamFormPatch,
  type FormPatchEntityType,
} from '@/agent/formPatch.js';
import { logger } from '@/logging/logger.js';

const formChatLog = logger.child('formChat');

import { convertToModelMessages, type UIMessage } from 'ai';

interface FormChatBody {
  entityType?: FormPatchEntityType;
  currentValues?: string; // wait, in useEntityChat it passes stringified values for grounding, let's keep it flexible
  messages?: UIMessage[];
}

export const formChatRoute = new Hono();

formChatRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as FormChatBody;

  if (!body.entityType || !FORM_PATCH_ENTITY_TYPES.includes(body.entityType)) {
    return c.json({ error: 'invalid entityType' }, 400);
  }

  const incoming = body.messages ?? [];
  if (incoming.length === 0) {
    return c.json({ error: 'messages required' }, 400);
  }

  try {
    const modelMessages = await convertToModelMessages(incoming);
    // Remove the last message from modelMessages, we handle it inside streamFormPatch? No, just pass all modelMessages!
    
    const result = await streamFormPatch(ctx, {
      entityType: body.entityType,
      currentValues: typeof body.currentValues === 'string' ? JSON.parse(body.currentValues || '{}') : (body.currentValues ?? {}),
      messages: modelMessages,
    });
    
    return result.toUIMessageStreamResponse();
  } catch (e) {
    formChatLog.error('form chat failed', { error: (e as Error).message, entityType: body.entityType });
    return c.json({ error: (e as Error).message }, 400);
  }
});
