import { streamText, tool, stepCountIs, type ModelMessage } from 'ai';
import { z } from 'zod';
import { createApiClient, unwrap } from '@/backend/client.js';
import { EVENT_TYPES, FINANCE_NODE_TYPES } from '@/backend/enums.js';
import type { components } from '@/backend/schema.js';
import { languageName, type RequestContext } from '@/context.js';
import { largeModel } from '@/models.js';
import { logger } from '@/logging/logger.js';
import { buildFinanceTools } from '@/tools/finance.js';

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
  messages: ModelMessage[];
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

/** Streams a partial patch (only the fields the user asked to change) for a form-attached mini-chat, plus a short reply. */
export async function streamFormPatch(ctx: RequestContext, input: FormPatchInput) {
  const grounding = await groundingFor(ctx, input.entityType);
  const system = [
    `You help the user fill in a "${ENTITY_LABEL[input.entityType]}" form in a personal finance app, through a short chat.`,
    `CURRENT FORM VALUES:\n${JSON.stringify(input.currentValues)}`,
    grounding,
    `\nYou have tools to query the user's financial data to help them fill the form.`,
    `To apply edits to the form, you MUST call the "patch_form" tool with ONLY the fields the user wants to change (leave others null).`,
    `Never invent IDs; search for the correct entity using your tools if needed, or use IDs from the grounding lists provided.`,
    `If the user attaches an image/file, use it as the source of truth for the fields it clearly shows.`,
    `Your final text response should be a short friendly reply summarizing what you changed (or why you couldn't), in ${languageName(ctx.lang)}.`,
  ].join('\n');

  const financeTools = buildFinanceTools(ctx);
  const readTools = Object.fromEntries(
    Object.entries(financeTools)
      .filter(([, t]) => t.kind === 'READ')
      .map(([name, t]) => [name, t.tool])
  );

  try {
    const result = streamText({
      model: largeModel(),
      system,
      messages: input.messages,
      stopWhen: stepCountIs(5),
      tools: {
        ...readTools,
        patch_form: input.entityType === 'category' ? tool({
          description: `Apply changes to the category form. You must call this tool to apply any edits requested by the user.`,
          inputSchema: categoryPatchSchema,
          execute: async () => {
            return { success: true };
          },
        }) : input.entityType === 'tag' ? tool({
          description: `Apply changes to the tag form. You must call this tool to apply any edits requested by the user.`,
          inputSchema: tagPatchSchema,
          execute: async () => {
            return { success: true };
          },
        }) : input.entityType === 'node' ? tool({
          description: `Apply changes to the node form. You must call this tool to apply any edits requested by the user.`,
          inputSchema: nodePatchSchema,
          execute: async () => {
            return { success: true };
          },
        }) : tool({
          description: `Apply changes to the template form. You must call this tool to apply any edits requested by the user.`,
          inputSchema: templatePatchSchema,
          execute: async () => {
            return { success: true };
          },
        }),
      },
    });
    
    return result;
  } catch (e) {
    formPatchLog.error('form patch generation failed', { error: (e as Error).message, entityType: input.entityType });
    throw e;
  }
}
