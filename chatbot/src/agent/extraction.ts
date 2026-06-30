import { generateObject, generateText, type ModelMessage } from 'ai';
import { z } from 'zod';
import { BackendClient } from '../backend/client.js';
import { languageName, type RequestContext } from '../context.js';
import { groundingNow, toServerDateTime } from '../dates.js';
import { largeModel, fastModel } from '../models.js';

export interface ImageInput {
  data: string;
  mediaType: string;
}

export interface ExtractInput {
  text?: string;
  images?: ImageInput[];
  templateId?: number;
}

const extractionSchema = z.object({
  name: z.string().describe('Short event name, 2-6 words (e.g. "Groceries", "Salary").'),
  amount: z.number().describe('Total absolute amount, always positive.'),
  sourceNodeId: z.number().nullable().describe('ID of the origin node (money out) from the provided list, or null.'),
  destinationNodeId: z.number().nullable().describe('ID of the destination node (money in) from the provided list, or null.'),
  categoryId: z.number().nullable().describe('ID of the best matching category from the provided list, or null.'),
  tagIds: z.array(z.number()).describe('IDs of matching tags from the provided list. Empty if none apply.'),
  transactionDate: z
    .string()
    .nullable()
    .describe('Date as YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss. Null if not mentioned.'),
  type: z.enum(['INBOUND', 'OUTBOUND', 'OTHER']).describe('Direction: OUTBOUND for spending, INBOUND for income.'),
});

export type Extraction = z.infer<typeof extractionSchema>;

export interface ExtractedEvent extends Extraction {
  description: string;
  /** Transaction date converted to the server timezone, ready to persist. */
  serverTransactionDate: string | null;
}

function compactList(items: Array<Record<string, unknown>>, fields: string[]): string {
  return items
    .map((it) => `[${fields.map((f) => `${f}=${it[f] ?? ''}`).join(', ')}]`)
    .join(', ');
}

async function buildContext(backend: BackendClient, templateId?: number): Promise<string> {
  const [nodes, categories, tags] = await Promise.all([
    backend.get<Array<Record<string, unknown>>>('/finance-nodes', { archived: false }),
    backend.get<Array<Record<string, unknown>>>('/categories', { archived: false }),
    backend.get<Array<Record<string, unknown>>>('/tags', { archived: false }),
  ]);

  let context =
    `FINANCE NODES: ${compactList(nodes, ['id', 'name', 'type'])}\n` +
    `CATEGORIES: ${compactList(categories, ['id', 'name'])}\n` +
    `TAGS: ${compactList(tags, ['id', 'name'])}`;

  if (templateId != null) {
    const template = await backend.get<Record<string, unknown>>(`/templates/${templateId}`);
    context += `\n\nUSE THIS TEMPLATE AS THE BASIS (prefer its defaults unless the input clearly overrides them):\n${JSON.stringify(template)}`;
  }

  return context;
}

function normalizeDate(value: string | null, timezone: string): string | null {
  if (!value) return null;
  const local = value.includes('T') ? value : `${value}T12:00:00`;
  return toServerDateTime(local, timezone);
}

/** Extracts a structured finance event from free text and/or images, grounded by domain data. */
export async function extractFinanceEvent(ctx: RequestContext, input: ExtractInput): Promise<ExtractedEvent> {
  const backend = new BackendClient(ctx);
  const context = await buildContext(backend, input.templateId);

  const system =
    `You extract a single finance event from the user's input. Current date/time: ${groundingNow(ctx.timezone)}.\n` +
    `Resolve nodes, category and tags to IDs using ONLY the lists below. If something is missing, use null.\n` +
    `Respond grounded in ${languageName(ctx.lang)}.\n\n${context}`;

  const userContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mediaType: string }> = [];
  if (input.text) userContent.push({ type: 'text', text: input.text });
  for (const img of input.images ?? []) {
    userContent.push({ type: 'image', image: img.data, mediaType: img.mediaType });
  }
  if (userContent.length === 0) userContent.push({ type: 'text', text: 'Extract the event.' });

  const messages: ModelMessage[] = [{ role: 'user', content: userContent }];

  const { object } = await generateObject({
    model: largeModel(),
    schema: extractionSchema,
    system,
    messages,
  });

  const description = await generateDescription(ctx, input.text ?? object.name, object);

  return {
    ...object,
    description,
    serverTransactionDate: normalizeDate(object.transactionDate, ctx.timezone),
  };
}

/** Generates a concise description grounded by the user's similar past events. */
async function generateDescription(ctx: RequestContext, source: string, object: Extraction): Promise<string> {
  const backend = new BackendClient(ctx);
  let examples = '';
  try {
    const tolerance = Math.max(object.amount * 0.25, 1);
    const page = await backend.get<{ content: Array<{ name: string; description?: string }> }>('/events', {
      page: 0,
      size: 6,
      categoryId: object.categoryId ?? undefined,
      minAmount: object.amount - tolerance,
      maxAmount: object.amount + tolerance,
    });
    examples = page.content
      .filter((e) => e.description)
      .map((e) => `- ${e.name}: ${e.description}`)
      .join('\n');
  } catch {
    // grounding is best-effort
  }

  const { text } = await generateText({
    model: fastModel(),
    system:
      `Write ONE short sentence describing this finance event, in ${languageName(ctx.lang)}. ` +
      `Match the brevity and style of the user's similar past events. Return only the sentence, no quotes.`,
    prompt:
      `EVENT: ${object.name} (amount ${object.amount})\nSOURCE TEXT: ${source}` +
      (examples ? `\n\nSIMILAR PAST EVENTS:\n${examples}` : ''),
  });
  return text.trim().replace(/^["']|["']$/g, '');
}

/** Builds the FinanceEventDto payload used to persist a draft from an extraction. */
export function toDraftPayload(event: ExtractedEvent): Record<string, unknown> {
  return {
    name: event.name,
    description: event.description,
    type: event.type,
    transactionDate: event.serverTransactionDate,
    category: event.categoryId != null ? { id: event.categoryId } : null,
    tags: event.tagIds.map((id) => ({ id })),
    lineItems: [
      { financeNodeId: event.sourceNodeId, amount: -event.amount },
      { financeNodeId: event.destinationNodeId, amount: event.amount },
    ],
  };
}
