import { generateObject, type ModelMessage } from 'ai';
import { z } from 'zod';
import { createApiClient, unwrap } from '@/backend/client.js';
import { EVENT_TYPES, FINANCE_NODE_TYPES } from '@/backend/enums.js';
import type { components } from '@/backend/schema.js';
import { languageName, type RequestContext } from '@/context.js';
import { fastModel } from '@/models.js';
import { logger } from '@/logging/logger.js';

const formPatchLog = logger.child('formPatch');

export const FORM_PATCH_ENTITY_TYPES = ['category', 'tag', 'node', 'template'] as const;
export type FormPatchEntityType = (typeof FORM_PATCH_ENTITY_TYPES)[number];

export interface FormPatchFileInput {
  data: string;
  mediaType: string;
  filename?: string;
}

export interface FormPatchTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface FormPatchInput {
  entityType: FormPatchEntityType;
  currentValues: Record<string, unknown>;
  conversation: FormPatchTurn[];
  message: string;
  files?: FormPatchFileInput[];
}

export interface FormPatchResult {
  patch: Record<string, unknown>;
  reply: string;
}

const ENTITY_LABEL: Record<FormPatchEntityType, string> = {
  category: 'Category (a budgeting bucket)',
  tag: 'Tag (a transversal label for grouping events)',
  node: 'Finance node (an account/wallet/card, an external entity, or a contact)',
  template: 'Template (a blueprint that generates events on a schedule or on demand)',
};

const categoryPatchSchema = z.object({
  name: z.string().nullable().describe('New name, or null to leave unchanged.'),
  description: z.string().nullable().describe('New description, or null to leave unchanged.'),
  icon: z.string().nullable().describe('New Material Symbols icon name, or null to leave unchanged.'),
});

const tagPatchSchema = z.object({
  name: z.string().nullable().describe('New name, or null to leave unchanged.'),
  description: z.string().nullable().describe('New description, or null to leave unchanged.'),
});

const nodePatchSchema = z.object({
  name: z.string().nullable().describe('New name, or null to leave unchanged.'),
  type: z
    .enum(FINANCE_NODE_TYPES)
    .nullable()
    .describe('OWN (own account/wallet/card), EXTERNAL (store/employer/utility) or CONTACT (a person). Null to leave unchanged.'),
  description: z.string().nullable().describe('New description, or null to leave unchanged.'),
  icon: z.string().nullable().describe('New Material Symbols icon name, or null to leave unchanged.'),
});

const templatePatchSchema = z.object({
  name: z.string().nullable().describe('New name, or null to leave unchanged.'),
  description: z.string().nullable().describe('New description, or null to leave unchanged.'),
  eventType: z.enum(EVENT_TYPES).nullable().describe('Null to leave unchanged.'),
  categoryId: z.number().nullable().describe('ID of the best matching category from the provided list, or null to leave unchanged.'),
  tagIds: z.array(z.number()).nullable().describe('IDs of matching tags from the provided list, or null to leave unchanged.'),
  modifierType: z.enum(['FIXED', 'PERCENTAGE']).nullable().describe('Null to leave unchanged.'),
  modifierValue: z.number().nullable().describe('Null to leave unchanged.'),
});

const PATCH_SCHEMA_BY_ENTITY = {
  category: categoryPatchSchema,
  tag: tagPatchSchema,
  node: nodePatchSchema,
  template: templatePatchSchema,
};

function schemaFor(entityType: FormPatchEntityType) {
  return z.object({
    patch: PATCH_SCHEMA_BY_ENTITY[entityType],
    reply: z.string().describe("Short, friendly reply describing what you changed, in the user's language."),
  });
}

function compactList<T extends object>(items: T[], fields: Array<keyof T & string>): string {
  return items
    .map((it) => `[${fields.map((f) => `${f}=${(it as Record<string, unknown>)[f] ?? ''}`).join(', ')}]`)
    .join(', ');
}

/** Templates reference categories/tags by ID, so ground the model with the current lists — same pattern as extraction.ts. */
async function groundingFor(ctx: RequestContext, entityType: FormPatchEntityType): Promise<string> {
  if (entityType !== 'template') return '';
  const client = createApiClient(ctx);
  const [categories, tags] = await Promise.all([
    unwrap(client.GET('/categories', { params: { query: { archived: false } } })),
    unwrap(client.GET('/tags', { params: { query: { archived: false } } })),
  ]);
  return (
    `\n\nCATEGORIES: ${compactList((categories ?? []) as components['schemas']['CategoryDto'][], ['id', 'name'])}` +
    `\nTAGS: ${compactList((tags ?? []) as components['schemas']['TagDto'][], ['id', 'name'])}`
  );
}

/** Generates a partial patch (only the fields the user asked to change) for a form-attached mini-chat, plus a short reply. */
export async function generateFormPatch(ctx: RequestContext, input: FormPatchInput): Promise<FormPatchResult> {
  const grounding = await groundingFor(ctx, input.entityType);
  const system = [
    `You help the user fill in a "${ENTITY_LABEL[input.entityType]}" form in a personal finance app, through a short chat.`,
    `CURRENT FORM VALUES:\n${JSON.stringify(input.currentValues)}`,
    grounding,
    `\nReturn a patch with ONLY the fields the user's latest message asks to change — leave every other field null.`,
    `Never invent IDs; only use IDs from the lists provided. If the user attaches an image/file, use it as the source`,
    `of truth for the fields it clearly shows (e.g. a logo, a receipt).`,
    `Also return a short "reply" summarizing what you changed (or, if nothing applied, why), in ${languageName(ctx.lang)}.`,
  ].join('\n');

  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: string; mediaType: string }
    | { type: 'file'; data: string; mediaType: string; filename?: string }
  > = [];
  if (input.message) userContent.push({ type: 'text', text: input.message });
  for (const file of input.files ?? []) {
    if (file.mediaType.startsWith('image/')) {
      userContent.push({ type: 'image', image: file.data, mediaType: file.mediaType });
    } else {
      userContent.push({ type: 'file', data: file.data, mediaType: file.mediaType, filename: file.filename });
    }
  }
  if (userContent.length === 0) userContent.push({ type: 'text', text: 'Apply the requested changes.' });

  const messages: ModelMessage[] = [
    ...input.conversation.map((turn): ModelMessage => ({ role: turn.role, content: turn.text })),
    { role: 'user', content: userContent },
  ];

  try {
    const { object } = await generateObject({
      model: fastModel(),
      schema: schemaFor(input.entityType),
      system,
      messages,
    });
    const patch = Object.fromEntries(Object.entries(object.patch).filter(([, value]) => value !== null && value !== undefined));
    return { patch, reply: object.reply };
  } catch (e) {
    formPatchLog.error('form patch generation failed', { error: (e as Error).message, entityType: input.entityType });
    throw e;
  }
}
