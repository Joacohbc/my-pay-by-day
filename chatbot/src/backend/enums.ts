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
