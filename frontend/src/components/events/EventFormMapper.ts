import { z } from 'zod/v4';
import type { CreateEventDto, PatchEventDto, FinanceEvent, Category, Tag, FinanceLineItem, CreateTransactionDto } from '@/models';
import { toLocalDateTimeString, getLocalizedNow } from '@/lib/format';
import { nameField, descriptionField } from '@/lib/validation';

// ─── Schema ──────────────────────────────────────────────────────────────────

export function buildSchema(t: (key: string) => string) {
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
    lineItems: z.array(lineItemSchema).min(1, t('eventForm.atLeastOneLine')),
    isDraft: z.boolean().nullable().optional(),
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
    isDraft: false,
    draftId: values.draftId ?? undefined,
  };
}

export function toPatchDto(values: FormValues, dirtyFields: Record<string, unknown>): PatchEventDto {
  const patch: PatchEventDto = {};

  if (dirtyFields.name) patch.name = values.name;
  if (dirtyFields.description) patch.description = values.description || null;
  if (dirtyFields.type) patch.type = values.type;
  
  if (dirtyFields.categoryId) {
    patch.category = values.categoryId ? { id: Number(values.categoryId) } : null;
  }
  
  if (dirtyFields.tagIds) {
    patch.tags = values.tagIds?.map((id: string) => ({ id: Number(id) })) || null;
  }

  // If date or any line item is dirty, we send the whole transaction
  if (dirtyFields.transactionDate || dirtyFields.lineItems) {
    patch.transaction = toTransactionDto(values);
  }

  return patch;
}

export function toDraftDto(values: FormValues, t: (key: string) => string): Partial<FinanceEvent> {
  const isSimplifiedMode = values.isSimplifiedMode ?? false;
  const draftDto: Partial<FinanceEvent> = {
    name: values.name || t('drafts.untitledDraft'),
    description: values.description || undefined,
    type: values.type,
  };

  const transactionDate = values.transactionDate
    ? (values.transactionDate.includes(':00.000') ? values.transactionDate : `${values.transactionDate}:00.000`)
    : undefined;

  draftDto.transactionDate = transactionDate || `${toLocalDateTimeString(getLocalizedNow())}:00.000`;
  
  draftDto.lineItems = values.lineItems.map((li, i) => {
      const amountStr = li.amount;
      let amount = amountStr ? Number(amountStr) : 0;
      if (isSimplifiedMode) {
        amount = i === 0 ? -Math.abs(amount) : Math.abs(amount);
      }
      return {
        id: 0,
        financeNodeId: li.nodeId ? Number(li.nodeId) : 0,
        financeNodeName: '',
        amount,
      } as FinanceLineItem;
    }).filter((li) => li.financeNodeId || li.amount !== 0);

  if (values.categoryId) draftDto.category = { id: Number(values.categoryId) } as Category;
  if (values.tagIds?.length) draftDto.tags = values.tagIds.map((id: string) => ({ id: Number(id) } as Tag));

  draftDto.isDraft = true;
  draftDto.draftId = values.draftId ?? undefined;

  return draftDto;
}
