import type { components } from '@/backend/schema.js';

type Schemas = components['schemas'];

/**
 * Enum value tuples mirrored from the backend OpenAPI contract. The `satisfies` guard makes
 * the compiler reject any value the backend has renamed or removed on the next `gen:api`, so
 * the LLM-facing zod schemas and the outgoing request payloads always share the backend truth.
 * (A newly *added* backend value is not caught here — `gen:api` + typecheck is the sync ritual.)
 */
export const FINANCE_NODE_TYPES = ['OWN', 'EXTERNAL', 'CONTACT'] as const satisfies readonly Schemas['FinanceNodeType'][];
export const EVENT_TYPES = ['INBOUND', 'OUTBOUND', 'OTHER'] as const satisfies readonly Schemas['EventType'][];
export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'CANCELLED'] as const satisfies readonly Schemas['SubscriptionStatus'][];
export const RECURRENCE_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'INSTANT'] as const satisfies readonly Schemas['RecurrenceFrequency'][];
export const PAYMENT_PLAN_TYPES = ['INSTALLMENT', 'RECURRING', 'GROUP', 'CUSTOM'] as const satisfies readonly Schemas['PaymentPlanType'][];
/** Cadences a plan can actually be scheduled on. INSTANT is reserved for one-off GROUP plans. */
export const SCHEDULABLE_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const satisfies readonly Schemas['RecurrenceFrequency'][];
export const PAYMENT_PLAN_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const satisfies readonly Schemas['PaymentPlanStatus'][];
export const PAYMENT_PLAN_ITEM_STATUSES = ['PENDING', 'DRAFTED', 'PAID', 'SKIPPED', 'OVERDUE'] as const satisfies readonly Schemas['PaymentPlanItemStatus'][];
