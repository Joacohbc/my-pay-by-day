import type { EventPatchBody, FinanceEventDto } from '@/backend/client.js';
import { asServerDateTime, toServerDateTime, type ServerDateTime } from '@/dates.js';
import type { BotDraft, BotEvent, BotEventType, BotEventPatch } from '@/bot/dto.js';

/** Draft input as it arrives from a zod tool schema (nullable) or a clean caller (undefined). */
interface DraftInput {
  name: string;
  description?: string | null;
  type: BotEventType;
  amount: number;
  sourceNodeId?: number | null;
  destNodeId?: number | null;
  categoryId?: number | null;
  tagIds?: number[] | null;
  date?: string | null;
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

/**
 * Builds the raw `FinanceEventDto` a draft endpoint expects from the flat bot input.
 * When `targetEventId` is set, the payload carries it as `id`, which the backend records as the
 * draft's `originalEntityId` (edit-as-draft).
 */
export function toDraftPayload(input: DraftInput, timezone: string, targetEventId?: number): FinanceEventDto {
  return {
    id: targetEventId,
    name: input.name,
    description: input.description ?? undefined,
    type: input.type,
    transactionDate: normalizeDate(input.date, timezone),
    category: input.categoryId != null ? { id: input.categoryId } : undefined,
    tags: (input.tagIds ?? []).map((id) => ({ id })),
    lineItems: [
      { financeNodeId: input.sourceNodeId ?? undefined, amount: -input.amount },
      { financeNodeId: input.destNodeId ?? undefined, amount: input.amount },
    ],
  };
}

/** Flattens a backend `FinanceEventDto` into the LLM-facing view. */
export function toBotEvent(dto: FinanceEventDto): BotEvent {
  const items = dto.lineItems ?? [];
  const source = items.find((li) => (li.amount ?? 0) < 0);
  const dest = items.find((li) => (li.amount ?? 0) >= 0);
  const amount = dto.amount ?? (dest?.amount != null ? Math.abs(dest.amount) : 0);
  return {
    id: dto.id ?? 0,
    name: dto.name ?? '',
    description: dto.description ?? undefined,
    type: dto.type ?? 'OUTBOUND',
    amount,
    sourceNodeId: source?.financeNodeId ?? undefined,
    destNodeId: dest?.financeNodeId ?? undefined,
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
    amount: base.amount,
    sourceNodeId: base.sourceNodeId,
    destNodeId: base.destNodeId,
    categoryId: base.categoryId,
    tagIds: base.tagIds,
    date: base.date,
    draftId: dto.draftId ?? 0,
    originalEventId: dto.id ?? undefined,
  };
}

/**
 * Folds a partial bot edit into the raw-value patch shape `PATCH /events/{id}` expects. Rebuilds
 * the transaction (nodes + amount) from `current` for any field the caller left unset, so a
 * partial edit never wipes the other side of the transaction.
 */
export function toEventPatch(patch: BotEventPatch, current: FinanceEventDto, timezone: string): EventPatchBody {
  const body: EventPatchBody = {};
  if (patch.name != null) body.name = patch.name;
  if (patch.description != null) body.description = patch.description;
  if (patch.type != null) body.type = patch.type;
  if (patch.categoryId != null) body.category = { id: patch.categoryId };
  if (patch.tagIds != null) body.tags = patch.tagIds.map((id) => ({ id }));

  const wantsTransaction =
    patch.date != null || patch.amount != null || patch.sourceNodeId != null || patch.destNodeId != null;
  if (wantsTransaction) {
    const items = current.lineItems ?? [];
    const source = items.find((li) => (li.amount ?? 0) < 0);
    const dest = items.find((li) => (li.amount ?? 0) >= 0);
    const amount = patch.amount ?? dest?.amount ?? (source?.amount != null ? -source.amount : 0);
    const sourceNodeId = patch.sourceNodeId ?? source?.financeNodeId ?? null;
    const destNodeId = patch.destNodeId ?? dest?.financeNodeId ?? null;
    body.transaction = {
      transactionDate:
        normalizeDate(patch.date, timezone) ??
        (current.transactionDate ? asServerDateTime(current.transactionDate) : null),
      lineItems: [
        { financeNode: sourceNodeId != null ? { id: sourceNodeId } : null, amount: -Math.abs(amount) },
        { financeNode: destNodeId != null ? { id: destNodeId } : null, amount: Math.abs(amount) },
      ],
    };
  }
  return body;
}
