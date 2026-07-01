import { z } from 'zod';
import { EVENT_TYPES } from '@/backend/enums.js';

export type BotEventType = (typeof EVENT_TYPES)[number];

/** Flat, LLM-friendly finance-event fields shared by real events and drafts. */
export interface BotEventCore {
  name: string;
  description?: string;
  type: BotEventType;
  /** Absolute amount (backend-computed sum of positive line items). */
  amount: number;
  /** Node the money left (negative line item), if known. */
  sourceNodeId?: number;
  /** Node the money entered (positive line item), if known. */
  destNodeId?: number;
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
  amount: number;
  sourceNodeId?: number;
  destNodeId?: number;
  categoryId?: number;
  tagIds?: number[];
  date?: string;
}

export const botEventInputSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  type: z.enum(EVENT_TYPES).default('OUTBOUND'),
  amount: z.number().positive(),
  sourceNodeId: z.number().nullish(),
  destNodeId: z.number().nullish(),
  categoryId: z.number().nullish(),
  tagIds: z.array(z.number()).nullish(),
  date: z.string().nullish().describe('YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss in the user timezone.'),
});

/** Partial edit of an existing event. Every field except `eventId` is optional. */
export const botEventPatchSchema = z.object({
  eventId: z.number(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  type: z.enum(EVENT_TYPES).nullish(),
  amount: z.number().positive().nullish(),
  sourceNodeId: z.number().nullish(),
  destNodeId: z.number().nullish(),
  categoryId: z.number().nullish(),
  tagIds: z.array(z.number()).nullish(),
  date: z.string().nullish(),
});

export const botEventFilterSchema = z.object({
  search: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  type: z.enum(EVENT_TYPES).nullish(),
  categoryId: z.number().nullish(),
  tagId: z.number().nullish(),
  nodeId: z.number().nullish(),
  minAmount: z.number().nullish(),
  maxAmount: z.number().nullish(),
  limit: z.number().min(1).max(50).default(50),
});

export type BotEventPatch = z.infer<typeof botEventPatchSchema>;
