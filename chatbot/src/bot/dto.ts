import { z } from 'zod';
import {
  EVENT_TYPES,
  PAYMENT_PLAN_ITEM_STATUSES,
  PAYMENT_PLAN_STATUSES,
  RECURRENCE_FREQUENCIES,
  SCHEDULABLE_FREQUENCIES,
} from '@/backend/enums.js';

export type BotEventType = (typeof EVENT_TYPES)[number];

/**
 * Some models emit numeric/array tool arguments as JSON-stringified text (e.g. categoryId: "10",
 * tagIds: "[4, 41]") instead of native types, which a strict schema rejects outright and sends the
 * model into a retry loop that burns its step budget on the same mistake. These coerce the common
 * stringified shapes back into the expected type before validation.
 */
export const lenientNumber = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
  z.number(),
);

export const NumericId = lenientNumber;

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

const NumericIdArray = stringifiedArray(z.array(NumericId));

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
  nodeId: NumericId.nullable(),
  amount: lenientNumber,
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
  categoryId: NumericId.nullish(),
  tagIds: NumericIdArray.nullish(),
  date: z.string().nullish().describe('YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss in the user timezone.'),
});

/** Partial edit of an existing event. Every field except `eventId` is optional. */
export const botEventPatchSchema = z.object({
  eventId: NumericId,
  name: z.string().nullish(),
  description: z.string().nullish(),
  type: z.enum(EVENT_TYPES).nullish(),
  lineItems: botLineItemsField.nullish(),
  categoryId: NumericId.nullish(),
  tagIds: NumericIdArray.nullish(),
  date: z.string().nullish(),
});

/** Partial edit of an existing draft. Every field except `draftId` is optional; omitted fields are preserved. */
export const botDraftPatchSchema = z.object({
  draftId: NumericId,
  targetEventId: NumericId.nullish(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  type: z.enum(EVENT_TYPES).nullish(),
  lineItems: botLineItemsField.nullish(),
  categoryId: NumericId.nullish(),
  tagIds: NumericIdArray.nullish(),
  date: z.string().nullish(),
});

export const botEventFilterSchema = z.object({
  search: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  type: z.enum(EVENT_TYPES).nullish(),
  categoryId: NumericId.nullish(),
  tagId: NumericId.nullish(),
  nodeId: NumericId.nullish(),
  minAmount: lenientNumber.nullish(),
  maxAmount: lenientNumber.nullish(),
  limit: z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().min(1).max(50).default(50)),
  page: z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().min(0).default(0)),
});

export type BotEventPatch = z.infer<typeof botEventPatchSchema>;
export type BotDraftPatch = z.infer<typeof botDraftPatchSchema>;

/**
 * The three payment plans the bot may create, one schema each. Splitting them by use case is
 * deliberate: a single schema with a planType discriminator let the model mix fields that don't
 * belong together (a cadence on a one-off group, a group with no events) and made the required
 * fields of each case unenforceable. CUSTOM is intentionally absent — it exists for schedules the
 * user hand-builds in the UI, and the bot has no way to know that shape.
 */
export const botEventGroupInputSchema = z.object({
  name: z.string().describe('What the group is: "Bariloche trip", "Ana\'s birthday".'),
  description: z.string().nullish(),
  date: z.string().describe('YYYY-MM-DD in the user timezone. The day the group covers.'),
  eventIds: NumericIdArray.nullish().describe('Existing events to bundle into the group right away.'),
  draftIds: NumericIdArray.nullish().describe('Existing drafts to bundle into the group right away.'),
  categoryId: NumericId.nullish(),
  tagIds: NumericIdArray.nullish(),
});

export const botInstallmentPlanInputSchema = z.object({
  name: z.string().describe('What was bought: "Fridge in 12 cuotas".'),
  description: z.string().nullish(),
  startDate: z.string().describe('YYYY-MM-DD of the first cuota, in the user timezone.'),
  totalInstallments: NumericId.describe('How many cuotas in total. The backend pre-generates one item each.'),
  installmentAmount: lenientNumber.nullish().describe('Amount of a single cuota. Required only when isAutomated is true.'),
  totalAmount: lenientNumber.nullish().describe('Full price. Used to report the remaining balance.'),
  frequency: z.enum(SCHEDULABLE_FREQUENCIES).default('MONTHLY').describe('How often a cuota falls due.'),
  isAutomated: lenientBoolean
    .nullish()
    .describe('When true the backend generates the event of each cuota by itself, and templateId plus installmentAmount become required.'),
  templateId: NumericId
    .nullish()
    .describe('Template supplying the origin and destination nodes of every generated event. Required when isAutomated is true.'),
  categoryId: NumericId.nullish(),
  tagIds: NumericIdArray.nullish(),
});

export const botRecurringPlanInputSchema = z.object({
  name: z.string().describe('The recurring agreement: "Netflix", "Rent".'),
  description: z.string().nullish(),
  startDate: z.string().describe('YYYY-MM-DD of the first charge, in the user timezone.'),
  endDate: z.string().nullish().describe('YYYY-MM-DD the agreement stops. Leave empty to keep it open-ended.'),
  frequency: z.enum(SCHEDULABLE_FREQUENCIES).default('MONTHLY').describe('How often it is charged.'),
  installmentAmount: lenientNumber.nullish().describe('Amount charged each cycle. Required only when isAutomated is true.'),
  isAutomated: lenientBoolean
    .nullish()
    .describe('When true the backend generates the event on each cycle by itself, and templateId plus installmentAmount become required.'),
  templateId: NumericId
    .nullish()
    .describe('Template supplying the origin and destination nodes of every generated event. Required when isAutomated is true.'),
  categoryId: NumericId.nullish(),
  tagIds: NumericIdArray.nullish(),
});

/** A window the user fills in by hand: no cadence, no automation, no amount of its own. */
export const botCustomPlanInputSchema = z.object({
  name: z.string().describe('What the plan tracks: "Debt with Ana", "Savings for the trip".'),
  description: z.string().nullish(),
  startDate: z.string().describe('YYYY-MM-DD the window opens, in the user timezone.'),
  endDate: z.string().describe('YYYY-MM-DD the window closes. Required: a custom plan is a bounded window.'),
  categoryId: NumericId.nullish(),
  tagIds: NumericIdArray.nullish(),
});

/** Partial edit of an existing payment plan. Omitted fields keep their current value. */
export const botPaymentPlanPatchSchema = z.object({
  planId: NumericId,
  name: z.string().nullish(),
  description: z.string().nullish(),
  status: z.enum(PAYMENT_PLAN_STATUSES).nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  frequency: z.enum(RECURRENCE_FREQUENCIES).nullish(),
  totalInstallments: NumericId.nullish(),
  totalAmount: lenientNumber.nullish(),
  installmentAmount: lenientNumber.nullish(),
  isAutomated: lenientBoolean.nullish(),
  templateId: NumericId.nullish(),
  categoryId: NumericId.nullish(),
  tagIds: NumericIdArray.nullish(),
});

/** Partial edit of a plan item. Links are changed with addToPaymentPlan / removeFromPaymentPlan instead. */
export const botPaymentPlanItemPatchSchema = z.object({
  planId: NumericId,
  itemId: NumericId,
  expectedDate: z.string().nullish().describe('Must fall inside the window the plan covers.'),
  installmentNumber: NumericId.nullish(),
  itemStatus: z.enum(PAYMENT_PLAN_ITEM_STATUSES).nullish(),
});

export type BotPaymentPlanPatch = z.infer<typeof botPaymentPlanPatchSchema>;
export type BotPaymentPlanItemPatch = z.infer<typeof botPaymentPlanItemPatchSchema>;
