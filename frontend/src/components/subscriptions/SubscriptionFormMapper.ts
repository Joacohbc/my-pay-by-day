import { z } from 'zod/v4';
import {
  nameField,
  descriptionField,
  optionalEventTypeField,
  optionalCategoryIdField,
  optionalTagIdsField,
} from '@/lib/validation';
import type { Subscription, CreateSubscriptionDto, EventType, RecurrenceFrequency, SubscriptionStatus } from '@/models';
import { getLocalizedTodayString } from '@/lib/format';

// ─── Schema ──────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  nodeId: z.string(),
  amount: z.string(),
});

export function buildSchema(t: (key: string, options?: Record<string, unknown>) => string, minItems = 2, maxItems?: number) {
  return z.object({
    name: nameField(t),
    description: descriptionField(t),
    eventType: optionalEventTypeField(),
    lineItems: maxItems
      ? z.array(lineItemSchema).min(minItems, t('eventForm.minLineItems', { count: minItems })).max(maxItems)
      : z.array(lineItemSchema).min(minItems, t('eventForm.minLineItems', { count: minItems })),
    categoryId: optionalCategoryIdField(),
    tagIds: optionalTagIdsField(),
    recurrence: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
      error: t('common.required'),
    }),
    nextExecutionDate: z.string().min(1, t('common.required')),
    status: z.enum(['ACTIVE', 'CANCELLED'], {
      error: t('common.required'),
    }),
  });
}

export type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_VALUES: FormValues = {
  name: '',
  description: '',
  eventType: '',
  lineItems: [
    { nodeId: '', amount: '' },
    { nodeId: '', amount: '' },
  ],
  categoryId: '',
  tagIds: [],
  recurrence: 'MONTHLY',
  nextExecutionDate: getLocalizedTodayString(),
  status: 'ACTIVE',
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function fromSubscription(subscription: Subscription): FormValues {
  const amount = subscription.modifierValue != null ? String(Math.abs(subscription.modifierValue)) : '';
  return {
    name: subscription.name,
    description: subscription.description ?? '',
    eventType: subscription.eventType ?? '',
    lineItems: [
      { nodeId: subscription.originNodeId ? String(subscription.originNodeId) : '', amount },
      { nodeId: subscription.destinationNodeId ? String(subscription.destinationNodeId) : '', amount },
    ],
    categoryId: subscription.category ? String(subscription.category.id) : '',
    tagIds: subscription.tags ? subscription.tags.map((tag) => String(tag.id)) : [],
    recurrence: subscription.recurrence,
    nextExecutionDate: subscription.nextExecutionDate.slice(0, 10),
    status: subscription.status,
  };
}

export function toCreateDto(values: FormValues): CreateSubscriptionDto {
  const firstAmount = values.lineItems[0]?.amount;
  return {
    name: values.name,
    description: values.description || undefined,
    originNodeId: values.lineItems[0]?.nodeId ? Number(values.lineItems[0].nodeId) : undefined,
    destinationNodeId: values.lineItems[1]?.nodeId ? Number(values.lineItems[1].nodeId) : undefined,
    category: values.categoryId ? { id: Number(values.categoryId) } : undefined,
    tags: values.tagIds?.map((id) => ({ id: Number(id) })),
    eventType: (values.eventType as EventType) || undefined,
    modifierValue: firstAmount ? Math.abs(Number(firstAmount)) : undefined,
    recurrence: values.recurrence as RecurrenceFrequency,
    nextExecutionDate: values.nextExecutionDate,
    status: values.status as SubscriptionStatus,
  };
}
