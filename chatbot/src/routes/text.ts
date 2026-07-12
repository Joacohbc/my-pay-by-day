import { errorJson } from '@/i18n.js';
import { generateText } from 'ai';
import { Hono } from 'hono';
import { createApiClient, unwrap, type FinanceEventDto } from '@/backend/client.js';
import { languageName, requestContextFrom, type RequestContext } from '@/context.js';
import { fastModel } from '@/models.js';
import { formattingGuidance } from '@/prompts/system.js';
import { logger } from '@/logging/logger.js';

const textLog = logger.child('text');

export const TEXT_ACTIONS = [
  'GENERATE_NAME',
  'GENERATE_DESCRIPTION',
  'MERGE_DESCRIPTION',
  'SUGGEST_NAME_FROM_SIMILAR',
  'SUGGEST_DESCRIPTION_FROM_SIMILAR',
  'IMPROVE_TEXT',
  'APPLY_INSTRUCTIONS',
] as const;

export type TextAction = (typeof TEXT_ACTIONS)[number];

interface TextRequest {
  action: TextAction;
  context?: string;
  currentValue?: string;
  categoryId?: number;
  amount?: number;
  instruction?: string;
}

const BASE_PROMPT: Record<TextAction, string> = {
  GENERATE_NAME:
    'Generate a concise, descriptive name (2-6 words) for a personal-finance entity based on the context.',
  GENERATE_DESCRIPTION:
    'Generate a single short, clear sentence describing a personal-finance entity based on the context. Never write more than one sentence.',
  MERGE_DESCRIPTION:
    'You are given several descriptions from finance events being merged. Blend them into ONE short, coherent sentence. Do not list them.',
  SUGGEST_NAME_FROM_SIMILAR:
    'Suggest a concise name (2-6 words) for a new finance event. Follow the naming style of the user\'s SIMILAR PAST EVENTS shown below.',
  SUGGEST_DESCRIPTION_FROM_SIMILAR:
    'Suggest a single short sentence describing a new finance event. Match the wording and brevity of the user\'s SIMILAR PAST EVENTS shown below.',
  IMPROVE_TEXT:
    'Improve the provided text: fix spelling and grammar and lightly improve wording and clarity. Preserve the meaning, tone and approximate length. Use the context to disambiguate, and if SIMILAR PAST EVENTS are shown below, match their wording style.',
  APPLY_INSTRUCTIONS:
    "Rewrite the provided text following the user's INSTRUCTION exactly. Preserve everything the instruction does not ask to change.",
};

function needsSimilar(action: TextAction): boolean {
  return action === 'SUGGEST_NAME_FROM_SIMILAR' || action === 'SUGGEST_DESCRIPTION_FROM_SIMILAR' || action === 'IMPROVE_TEXT';
}

async function similarExamples(ctx: RequestContext, req: TextRequest): Promise<string> {
  if (!needsSimilar(req.action)) return '';
  const client = createApiClient(ctx);
  try {
    const tolerance = req.amount != null ? Math.max(req.amount * 0.25, 1) : undefined;
    const page = await unwrap(
      client.GET('/events', {
        params: {
          query: {
            page: 0,
            size: 8,
            search: req.currentValue || req.context,
            categoryId: req.categoryId,
            minAmount: req.amount != null && tolerance != null ? req.amount - tolerance : undefined,
            maxAmount: req.amount != null && tolerance != null ? req.amount + tolerance : undefined,
          },
        },
      }),
    );
    const events = (page.content ?? []) as FinanceEventDto[];
    if (events.length === 0) return '';
    const lines = events
      .map((e) => `- ${e.name}${e.description ? ` — ${e.description}` : ''}`)
      .join('\n');
    return `\n\nSIMILAR PAST EVENTS:\n${lines}`;
  } catch (e) {
    textLog.warn('failed to fetch similar events', { error: (e as Error).message });
    return '';
  }
}

export const textRoute = new Hono();

textRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const req = (await c.req.json()) as TextRequest;
  if (!req.action || !TEXT_ACTIONS.includes(req.action)) {
    return errorJson(c, 'error.invalid_action', 400);
  }
  if (req.action === 'APPLY_INSTRUCTIONS' && !req.instruction?.trim()) {
    return errorJson(c, 'error.instruction_required', 400);
  }

  const base = BASE_PROMPT[req.action];
  const system =
    `You are a personal-finance writing assistant. ${base}\n` +
    `OUTPUT RULES: return ONLY the resulting plain text — no markdown, no quotes, no explanation. ` +
    `Write in ${languageName(ctx.lang)}. Keep it concise and suitable for a form field.\n` +
    formattingGuidance(ctx.lang, ctx.currency);

  const examples = await similarExamples(ctx, req);
  const userParts: string[] = [];
  if (req.context) userParts.push(`CONTEXT:\n${req.context}`);
  if (req.currentValue) userParts.push(`CURRENT VALUE:\n${req.currentValue}`);
  if (req.instruction) userParts.push(`INSTRUCTION:\n${req.instruction}`);
  userParts.push(examples.trim() || '');
  userParts.push('Produce the result now.');

  try {
    const { text } = await generateText({
      model: fastModel(),
      system,
      prompt: userParts.filter(Boolean).join('\n\n'),
    });
    return c.json({ text: text.trim().replace(/^["']|["']$/g, '') });
  } catch (e) {
    textLog.error('text action failed', { error: (e as Error).message, action: req.action });
    return c.json({ error: (e as Error).message }, 400);
  }
});
