import { z } from 'zod';
import { EVENT_TYPES } from '@/backend/enums.js';

export type BotEventType = (typeof EVENT_TYPES)[number];

/**
 * Some models emit numeric/array tool arguments as JSON-stringified text (e.g. categoryId: "10",
 * tagIds: "[4, 41]") instead of native types, which a strict schema rejects outright and sends the
 * model into a retry loop that burns its step budget on the same mistake. These coerce the common
 * stringified shapes back into the expected type before validation.
 */
const numericId = z.preprocess((value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value), z.number());

/** Coerces a JSON-stringified array (e.g. "[4, 41]" or '["a", "b"]') back into a real array before validating it. */
export function stringifiedArray<T extends z.ZodTypeAny>(arraySchema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, arraySchema);
}

const numericIdArray = stringifiedArray(z.array(numericId));

/** Coerces stringified booleans (including Python-style "True"/"False") back into real booleans. */
export const lenientBoolean = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}, z.boolean());

/** One movement in a transaction: positive amount = inflow to the node, negative = outflow. A transaction is a
 * list of these (2 for a simple purchase, 3+ for a split bill or multi-party settlement) that must sum to zero. */
export const botLineItemSchema = z.object({
  nodeId: z.number().nullable(),
  amount: z.number(),
});
export type BotLineItem = z.infer<typeof botLineItemSchema>;
const botLineItemsField = z
  .array(botLineItemSchema)
  .describe(
    'The full list of line items for this transaction. Positive amount = inflow to that node, negative = outflow. ' +
      'The amounts MUST sum to exactly zero. A simple purchase is 2 items (one negative, one positive); a bill ' +
      'split three ways or a multi-party settlement can have 3 or more.',
  );

/** Flat, LLM-friendly finance-event fields shared by real events and drafts. */
export interface BotEventCore {
  name: string;
  description?: string;
  type: BotEventType;
  lineItems: BotLineItem[];
  categoryId?: number;
  tagIds: number[];
  /** Wall-clock transaction date in the user's timezone. */
  date?: string;
}

/** A persisted finance event (always has a real id). */
export interface BotEvent extends BotEventCore {
  id: number;
}

/** A pending draft. `originalEventId` is set when the draft edits an existing event. */
export interface BotDraft extends BotEventCore {
  draftId: number;
  originalEventId?: number;
}

/** Fields the LLM supplies to create or update an event/draft. */
export interface BotEventInput {
  name: string;
  description?: string;
  type: BotEventType;
  lineItems: BotLineItem[];
  categoryId?: number;
  tagIds?: number[];
  date?: string;
}

export const botEventInputSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  type: z.enum(EVENT_TYPES).default('OUTBOUND'),
  lineItems: botLineItemsField,
  categoryId: numericId.nullish(),
  tagIds: numericIdArray.nullish(),
  date: z.string().nullish().describe('YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss in the user timezone.'),
});

/** Partial edit of an existing event. Every field except `eventId` is optional. */
export const botEventPatchSchema = z.object({
  eventId: z.number(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  type: z.enum(EVENT_TYPES).nullish(),
  lineItems: botLineItemsField.nullish(),
  categoryId: numericId.nullish(),
  tagIds: numericIdArray.nullish(),
  date: z.string().nullish(),
});

/** Partial edit of an existing draft. Every field except `draftId` is optional; omitted fields are preserved. */
export const botDraftPatchSchema = z.object({
  draftId: z.number(),
  targetEventId: z.number().nullish(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  type: z.enum(EVENT_TYPES).nullish(),
  lineItems: botLineItemsField.nullish(),
  categoryId: numericId.nullish(),
  tagIds: numericIdArray.nullish(),
  date: z.string().nullish(),
});

export const botEventFilterSchema = z.object({
  search: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  type: z.enum(EVENT_TYPES).nullish(),
  categoryId: numericId.nullish(),
  tagId: numericId.nullish(),
  nodeId: numericId.nullish(),
  minAmount: z.number().nullish(),
  maxAmount: z.number().nullish(),
  limit: z.number().min(1).max(50).default(50),
  page: z.number().min(0).default(0),
});

export type BotEventPatch = z.infer<typeof botEventPatchSchema>;
export type BotDraftPatch = z.infer<typeof botDraftPatchSchema>;
