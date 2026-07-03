import { z } from 'zod/v4';
import type { CreateEventDto, PatchEventDto, FinanceEvent, CreateTransactionDto, EventType, FinanceEventDraftInputDto } from '@/models';
import { toLocalDateTimeString, getLocalizedNow } from '@/lib/format';
import { nameField, descriptionField } from '@/lib/validation';

export const MIN_LINE_ITEMS = 2;

const DEFAULT_LINE_ITEMS = [
  { nodeId: '', amount: '' },
  { nodeId: '', amount: '' },
];

/**
 * Projects a persisted (or draft) {@link FinanceEvent} onto the shape the form inputs expect.
 * Used both as RHF's `defaultValues` baseline and as the `values` override when a draft exists.
 */
export function buildFormDefaults(defaultValues?: Partial<FinanceEvent>): FormValues {
  const transactionDate = defaultValues?.transactionDate
    ? toLocalDateTimeString(defaultValues.transactionDate)
    : toLocalDateTimeString(getLocalizedNow());

  const categoryId = defaultValues?.category ? String(defaultValues.category.id) : '';
  const tagIds = defaultValues?.tags?.map((tag) => String(tag.id)) ?? [];

  const lineItems =
    defaultValues?.lineItems?.map((li) => ({
      nodeId: String(li.financeNodeId),
      amount: li.amount !== 0 ? String(li.amount) : '',
    })) ?? DEFAULT_LINE_ITEMS;

  const numberOfLineItems = defaultValues?.lineItems?.length ?? 0;
  const numberOfEmptyItems = defaultValues?.lineItems?.filter((li) => !li.financeNodeId).length ?? 0;
  const isSimplifiedMode = numberOfEmptyItems > 0 && [0, 1, 2].includes(numberOfLineItems);

  return {
    name: defaultValues?.name ?? '',
    description: defaultValues?.description ?? '',
    type: (defaultValues?.type as EventType) ?? 'OUTBOUND',
    transactionDate,
    categoryId,
    tagIds,
    lineItems,
    draftId: defaultValues?.draftId,
    isSimplifiedMode,
  };
}

// ─── Schema ──────────────────────────────────────────────────────────────────

export function buildSchema(t: (key: string, options?: Record<string, unknown>) => string, minItems = 2, maxItems?: number) {
  const lineItemSchema = z.object({
    nodeId: z.string().min(1, t('eventForm.nodeRequired')),
    amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) !== 0, {
      message: t('eventForm.amountNonZero'),
    }),
  });

  return z.object({
    name: nameField(t),
    description: descriptionField(t),
    type: z.enum(['INBOUND', 'OUTBOUND', 'OTHER']),
    transactionDate: z.string().min(1, t('eventForm.dateRequired')),
    categoryId: z.string().optional(),
    tagIds: z.array(z.string()).optional(),
    lineItems: maxItems
      ? z.array(lineItemSchema).min(minItems, t('eventForm.minLineItems', { count: minItems })).max(maxItems)
      : z.array(lineItemSchema).min(minItems, t('eventForm.minLineItems', { count: minItems })),
    draftId: z.number().nullable().optional(),
    isSimplifiedMode: z.boolean().optional(),
  });
}

export type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Mappers ─────────────────────────────────────────────────────────────────

/** Shared logic to build the transaction part of the DTO */
export function toTransactionDto(values: FormValues): CreateTransactionDto {
  const isSimplifiedMode = values.isSimplifiedMode ?? false;
  return {
    transactionDate: values.transactionDate.includes(':00.000')
      ? values.transactionDate
      : `${values.transactionDate}:00.000`,
    lineItems: values.lineItems.map((li, i) => {
      let amount = Number(li.amount);
      if (isSimplifiedMode) {
        amount = i === 0 ? -Math.abs(amount) : Math.abs(amount);
      }
      return {
        financeNode: { id: Number(li.nodeId) },
        amount,
      };
    }),
  };
}

export function toCreateDto(values: FormValues): CreateEventDto {
  return {
    name: values.name,
    description: values.description || undefined,
    type: values.type,
    transaction: toTransactionDto(values),
    category: values.categoryId ? { id: Number(values.categoryId) } : undefined,
    tags: values.tagIds?.map((id: string) => ({ id: Number(id) })),
    draftId: values.draftId ?? undefined,
  };
}

/**
 * Computes a PatchEventDto by diffing the submitted form values against the persisted event.
 *
 * Replaces the previous RHF-`dirtyFields`-based approach so the patch no longer depends on
 * the form library's change tracking. Semantics match {@link PatchEventDto}:
 *   - field omitted → backend leaves it untouched
 *   - field set to `null` → backend clears it
 *   - field set to a value → backend updates it
 *
 * The transaction is atomic: if either the date or any line item changed, the whole
 * transaction is resent (same contract as the previous implementation and the backend's
 * {@code EventService.update}).
 */
export function toPatchDtoFromDiff(base: Partial<FinanceEvent>, values: FormValues): PatchEventDto {
  const patch: PatchEventDto = {};

  const baseName = base.name ?? '';
  if (values.name !== baseName) patch.name = values.name;

  const baseDescription = base.description ?? '';
  const nextDescription = values.description ?? '';
  if (nextDescription !== baseDescription) {
    patch.description = nextDescription ? nextDescription : null;
  }

  if (base.type !== values.type) patch.type = values.type;

  const baseCategoryId = base.category?.id != null ? String(base.category.id) : '';
  const nextCategoryId = values.categoryId ?? '';
  if (nextCategoryId !== baseCategoryId) {
    patch.category = nextCategoryId ? { id: Number(nextCategoryId) } : null;
  }

  const baseTagIds = (base.tags ?? []).map((tag) => String(tag.id)).sort();
  const nextTagIds = [...(values.tagIds ?? [])].sort();
  if (!sameStringArray(baseTagIds, nextTagIds)) {
    patch.tags = nextTagIds.length ? nextTagIds.map((id) => ({ id: Number(id) })) : null;
  }

  if (hasTransactionChanged(base, values)) {
    patch.transaction = toTransactionDto(values);
  }

  return patch;
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function hasTransactionChanged(base: Partial<FinanceEvent>, values: FormValues): boolean {
  const baseDateMinutes = base.transactionDate ? toLocalDateTimeString(base.transactionDate) : '';
  const nextDateMinutes = values.transactionDate.slice(0, 16);
  if (baseDateMinutes !== nextDateMinutes) return true;

  const baseLineItems = base.lineItems ?? [];
  const isSimplifiedMode = values.isSimplifiedMode ?? false;
  const nextLineItems = values.lineItems.map((li, i) => {
    let amount = Number(li.amount);
    if (isSimplifiedMode) {
      amount = i === 0 ? -Math.abs(amount) : Math.abs(amount);
    }
    return { nodeId: Number(li.nodeId), amount };
  });

  if (baseLineItems.length !== nextLineItems.length) return true;

  for (let i = 0; i < nextLineItems.length; i++) {
    if (baseLineItems[i].financeNodeId !== nextLineItems[i].nodeId) return true;
    if (Number(baseLineItems[i].amount) !== nextLineItems[i].amount) return true;
  }

  return false;
}

export function toDraftDto(values: FormValues, t: (key: string) => string): FinanceEventDraftInputDto {
  const isSimplifiedMode = values.isSimplifiedMode ?? false;
  
  const transactionDate = values.transactionDate
    ? (values.transactionDate.includes(':00.000') ? values.transactionDate : `${values.transactionDate}:00.000`)
    : undefined;

  const draftDto: FinanceEventDraftInputDto = {
    name: values.name || t('drafts.untitledDraft'),
    description: values.description || undefined,
    type: values.type,
    transactionDate: transactionDate || `${toLocalDateTimeString(getLocalizedNow())}:00.000`,
    categoryId: values.categoryId ? Number(values.categoryId) : undefined,
    tagIds: values.tagIds?.map((id: string) => Number(id)),
    isSimplifiedMode,
  };

  if (isSimplifiedMode) {
    const amountStr = values.lineItems[0]?.amount;
    draftDto.amount = amountStr ? Number(amountStr) : 0;
    draftDto.sourceNodeId = values.lineItems[0]?.nodeId ? Number(values.lineItems[0].nodeId) : undefined;
    draftDto.destNodeId = values.lineItems[1]?.nodeId ? Number(values.lineItems[1].nodeId) : undefined;
  } else {
    draftDto.lineItems = values.lineItems.map((li) => ({
      financeNodeId: li.nodeId ? Number(li.nodeId) : 0,
      amount: li.amount ? Number(li.amount) : 0,
    })).filter((li) => li.financeNodeId || li.amount !== 0);
  }

  return draftDto;
}

// ─── Draft-to-DTO converters (work on FinanceEvent directly) ─────────────────

function draftTransactionDto(draft: FinanceEvent): CreateTransactionDto {
  return {
    transactionDate: draft.transactionDate,
    lineItems: (draft.lineItems ?? []).map((li) => ({
      financeNode: { id: li.financeNodeId },
      amount: li.amount,
    })),
  };
}

export function fromDraftToCreateDto(draft: FinanceEvent): CreateEventDto {
  return {
    name: draft.name,
    description: draft.description,
    type: draft.type,
    transaction: draftTransactionDto(draft),
    category: draft.category?.id ? { id: draft.category.id } : undefined,
    tags: draft.tags?.map((tag) => ({ id: tag.id })),
    fileIds: draft.files?.map((file) => file.id),
  };
}

export function fromDraftToPatchDto(draft: FinanceEvent): PatchEventDto {
  return {
    name: draft.name,
    description: draft.description ?? null,
    type: draft.type,
    transaction: draftTransactionDto(draft),
    category: draft.category?.id ? { id: draft.category.id } : null,
    tags:
      draft.tags && draft.tags.length > 0
        ? draft.tags.map((tag) => ({ id: tag.id }))
        : null,
    fileIds:
      draft.files && draft.files.length > 0
        ? draft.files.map((file) => file.id)
        : null,
  };
}
