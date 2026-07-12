import { errorJson } from '@/i18n.js';
import { generateText } from 'ai';
import { Hono } from 'hono';
import { languageName, requestContextFrom } from '@/context.js';
import { fastModel } from '@/models.js';
import { formattingGuidance } from '@/prompts/system.js';
import { logger } from '@/logging/logger.js';

const textLog = logger.child('text');

export const TEXT_ACTIONS = ['MERGE_DESCRIPTION'] as const;

export type TextAction = (typeof TEXT_ACTIONS)[number];

interface TextRequest {
  action: TextAction;
  context?: string;
}

const BASE_PROMPT: Record<TextAction, string> = {
  MERGE_DESCRIPTION:
    'You are given several descriptions from finance events being merged. Blend them into ONE short, coherent sentence. Do not list them.',
};

export const textRoute = new Hono();

textRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const req = (await c.req.json()) as TextRequest;
  if (!req.action || !TEXT_ACTIONS.includes(req.action)) {
    return errorJson(c, 'error.invalid_action', 400);
  }

  const system =
    `You are a personal-finance writing assistant. ${BASE_PROMPT[req.action]}\n` +
    `OUTPUT RULES: return ONLY the resulting plain text — no markdown, no quotes, no explanation. ` +
    `Write in ${languageName(ctx.lang)}. Keep it concise and suitable for a form field.\n` +
    formattingGuidance(ctx.lang, ctx.currency);

  const prompt = [req.context ? `CONTEXT:\n${req.context}` : '', 'Produce the result now.']
    .filter(Boolean)
    .join('\n\n');

  try {
    const { text } = await generateText({ model: fastModel(), system, prompt });
    return c.json({ text: text.trim().replace(/^["']|["']$/g, '') });
  } catch (e) {
    textLog.error('text action failed', { error: (e as Error).message, action: req.action });
    return c.json({ error: (e as Error).message }, 400);
  }
});
