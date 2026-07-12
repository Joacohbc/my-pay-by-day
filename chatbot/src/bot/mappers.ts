import type { EventPatchBody, FinanceEventDraftInputDto, FinanceEventDto } from '@/backend/client.js';
import { asServerDateTime, toServerDateTime, type ServerDateTime } from '@/dates.js';
import type { BotDraft, BotEvent, BotEventType, BotEventPatch, BotDraftPatch, BotLineItem } from '@/bot/dto.js';

/** Draft input as it arrives from a zod tool schema (nullable) or a clean caller (undefined). */
interface DraftInput {
  name: string;
  description?: string | null;
  type: BotEventType;
  lineItems: BotLineItem[];
  categoryId?: number | null;
  tagIds?: number[] | null;
  date?: string | null;
}

/** Maps the LLM's flat {nodeId, amount} shape to the backend's {financeNodeId, amount} draft line item shape. */
function toDraftLineItems(lineItems: BotLineItem[] | null | undefined): { financeNodeId: number | null; amount: number }[] | undefined {
  if (!lineItems || lineItems.length === 0) return undefined;
  return lineItems.map((li) => ({ financeNodeId: li.nodeId, amount: li.amount }));
}

/**
 * Anchors a date-only value at local noon so converting the user's wall-clock to UTC never
 * crosses a calendar-day boundary, regardless of the user's UTC offset.
 */
function normalizeDate(value: string | null | undefined, timezone: string): ServerDateTime | undefined {
  if (!value) return undefined;
  const local = value.includes('T') ? value : `${value}T12:00:00`;
  return toServerDateTime(local, timezone);
}

/**
 * Converts a date filter into a full server-timezone `LocalDateTime` the backend can parse
 * (`GET /events` calls `LocalDateTime.parse`, which rejects a bare `YYYY-MM-DD`). `start` anchors
 * the beginning of the day, `end` the last second, in the user's timezone before conversion.
 */
export function toServerDateBoundary(
  value: string | null | undefined,
  timezone: string,
  edge: 'start' | 'end',
): ServerDateTime | undefined {
  if (!value) return undefined;
  const day = value.slice(0, 10);
  const time = edge === 'start' ? 'T00:00:00' : 'T23:59:59';
  return toServerDateTime(`${day}${time}`, timezone);
}

export function toDraftPayload(input: DraftInput, timezone: string): FinanceEventDraftInputDto {
  return {
    name: input.name,
    description: input.description ?? undefined,
    type: input.type,
    transactionDate: normalizeDate(input.date, timezone),
    categoryId: input.categoryId ?? undefined,
    tagIds: input.tagIds ?? undefined,
    lineItems: toDraftLineItems(input.lineItems),
  };
}

/**
 * Maps a partial bot edit into the FinanceEventDraftInputDto shape expected by PATCH /drafts.
 * Only mapped fields are included; the backend will apply the patch to the existing draft.
 */
export function toDraftPatchPayload(patch: Omit<BotDraftPatch, 'draftId'>, timezone: string): FinanceEventDraftInputDto {
  return {
    id: patch.targetEventId ?? undefined,
    name: patch.name ?? undefined,
    description: patch.description ?? undefined,
    type: patch.type ?? undefined,
    transactionDate: normalizeDate(patch.date, timezone),
    categoryId: patch.categoryId ?? undefined,
    tagIds: patch.tagIds ?? undefined,
    lineItems: toDraftLineItems(patch.lineItems),
  };
}

/** Flattens a backend `FinanceEventDto` into the LLM-facing view. */
export function toBotEvent(dto: FinanceEventDto): BotEvent {
  const items = dto.lineItems ?? [];
  return {
    id: dto.id ?? 0,
    name: dto.name ?? '',
    description: dto.description ?? undefined,
    type: dto.type ?? 'OUTBOUND',
    lineItems: items.map((li) => ({ nodeId: li.financeNodeId ?? null, amount: li.amount ?? 0 })),
    categoryId: dto.category?.id ?? undefined,
    tagIds: (dto.tags ?? []).map((t) => t.id).filter((id): id is number => id != null),
    date: dto.transactionDate ?? undefined,
  };
}

/** Flattens a draft `FinanceEventDto` (where `id` is the original event id, `draftId` the draft). */
export function toBotDraft(dto: FinanceEventDto): BotDraft {
  const base = toBotEvent(dto);
  return {
    name: base.name,
    description: base.description,
    type: base.type,
    lineItems: base.lineItems,
    categoryId: base.categoryId,
    tagIds: base.tagIds,
    date: base.date,
    draftId: dto.draftId ?? 0,
    originalEventId: dto.id ?? undefined,
  };
}

/**
 * Folds a partial bot edit into the raw-value patch shape `PATCH /events/{id}` expects. Resends the
 * full current transaction (unchanged) when only the date moved, so a date-only edit never wipes the
 * line items — the backend contract is atomic: any transaction field change resends the whole thing.
 */
export function toEventPatch(patch: BotEventPatch, current: FinanceEventDto, timezone: string): EventPatchBody {
  const body: EventPatchBody = {};
  if (patch.name != null) body.name = patch.name;
  if (patch.description != null) body.description = patch.description;
  if (patch.type != null) body.type = patch.type;
  if (patch.categoryId != null) body.category = { id: patch.categoryId };
  if (patch.tagIds != null) body.tags = patch.tagIds.map((id) => ({ id }));

  const wantsTransaction = patch.date != null || patch.lineItems != null;
  if (wantsTransaction) {
    const lineItems = patch.lineItems ?? (current.lineItems ?? []).map((li) => ({ nodeId: li.financeNodeId ?? null, amount: li.amount ?? 0 }));
    body.transaction = {
      transactionDate:
        normalizeDate(patch.date, timezone) ??
        (current.transactionDate ? asServerDateTime(current.transactionDate) : null),
      lineItems: lineItems.map((li) => ({ financeNode: li.nodeId != null ? { id: li.nodeId } : null, amount: li.amount })),
    };
  }
  return body;
}
