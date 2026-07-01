import { generateText } from 'ai';
import { Hono } from 'hono';
import { BackendClient } from '@/backend/client.js';
import { languageName, requestContextFrom, type RequestContext } from '@/context.js';
import { fastModel } from '@/models.js';

export const TEXT_ACTIONS = [
  'GENERATE_NAME',
  'GENERATE_DESCRIPTION',
  'FIX_NAME_SPELLING',
  'FIX_DESCRIPTION_SPELLING',
  'MERGE_DESCRIPTION',
  'SUGGEST_NAME_FROM_SIMILAR',
  'SUGGEST_DESCRIPTION_FROM_SIMILAR',
] as const;

export type TextAction = (typeof TEXT_ACTIONS)[number];

interface TextRequest {
  action: TextAction;
  context?: string;
  currentValue?: string;
  customPrompt?: string;
  categoryId?: number;
  amount?: number;
}

const BASE_PROMPT: Record<TextAction, string> = {
  GENERATE_NAME:
    'Generate a concise, descriptive name (2-6 words) for a personal-finance entity based on the context.',
  GENERATE_DESCRIPTION:
    'Generate a single short, clear sentence describing a personal-finance entity based on the context. Never write more than one sentence.',
  FIX_NAME_SPELLING:
    'Fix spelling and grammar mistakes in the provided name. Keep the same meaning and length.',
  FIX_DESCRIPTION_SPELLING:
    'Fix spelling and grammar mistakes in the provided description. Keep the same meaning. Keep it short.',
  MERGE_DESCRIPTION:
    'You are given several descriptions from finance events being merged. Blend them into ONE short, coherent sentence. Do not list them.',
  SUGGEST_NAME_FROM_SIMILAR:
    'Suggest a concise name (2-6 words) for a new finance event. Follow the naming style of the user\'s SIMILAR PAST EVENTS shown below.',
  SUGGEST_DESCRIPTION_FROM_SIMILAR:
    'Suggest a single short sentence describing a new finance event. Match the wording and brevity of the user\'s SIMILAR PAST EVENTS shown below.',
};

function needsSimilar(action: TextAction): boolean {
  return action === 'SUGGEST_NAME_FROM_SIMILAR' || action === 'SUGGEST_DESCRIPTION_FROM_SIMILAR';
}

async function similarExamples(ctx: RequestContext, req: TextRequest): Promise<string> {
  if (!needsSimilar(req.action)) return '';
  const backend = new BackendClient(ctx);
  try {
    const tolerance = req.amount != null ? Math.max(req.amount * 0.25, 1) : undefined;
    const page = await backend.get<{ content: Array<{ name: string; description?: string; amount?: number }> }>(
      '/events',
      {
        page: 0,
        size: 8,
        search: req.currentValue || req.context,
        categoryId: req.categoryId,
        minAmount: req.amount != null && tolerance != null ? req.amount - tolerance : undefined,
        maxAmount: req.amount != null && tolerance != null ? req.amount + tolerance : undefined,
      },
    );
    if (page.content.length === 0) return '';
    const lines = page.content
      .map((e) => `- ${e.name}${e.description ? ` — ${e.description}` : ''}`)
      .join('\n');
    return `\n\nSIMILAR PAST EVENTS:\n${lines}`;
  } catch {
    return '';
  }
}

export const textRoute = new Hono();

textRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const req = (await c.req.json()) as TextRequest;
  if (!req.action || !TEXT_ACTIONS.includes(req.action)) {
    return c.json({ error: 'invalid action' }, 400);
  }

  const base = req.customPrompt?.trim() || BASE_PROMPT[req.action];
  const system =
    `You are a personal-finance writing assistant. ${base}\n` +
    `OUTPUT RULES: return ONLY the resulting plain text — no markdown, no quotes, no explanation. ` +
    `Write in ${languageName(ctx.lang)}. Keep it concise and suitable for a form field.`;

  const examples = await similarExamples(ctx, req);
  const userParts: string[] = [];
  if (req.context) userParts.push(`CONTEXT:\n${req.context}`);
  if (req.currentValue) userParts.push(`CURRENT VALUE:\n${req.currentValue}`);
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
    return c.json({ error: (e as Error).message }, 400);
  }
});
