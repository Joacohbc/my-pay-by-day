import { tool } from 'ai';
import { z } from 'zod';
import { BackendClient, BackendError } from '@/backend/client.js';
import type { RequestContext } from '@/context.js';
import { toServerDateTime } from '@/dates.js';
import type { KindedToolSet } from '@/tools/types.js';

interface Paged<T> {
  content: T[];
}

async function safe<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof BackendError ? e.message : (e as Error).message;
    return { error: message };
  }
}

/**
 * Anchors a date-only value at local noon so converting the user's wall-clock to UTC
 * never crosses a calendar-day boundary, regardless of the user's UTC offset.
 */
function normalizeTransactionDate(value: string | undefined, timezone: string): string | undefined {
  if (!value) return undefined;
  const local = value.includes('T') ? value : `${value}T12:00:00`;
  return toServerDateTime(local, timezone);
}

export function buildFinanceTools(ctx: RequestContext): KindedToolSet {
  const backend = new BackendClient(ctx);

  return {
    // ===================== READ =====================
    getFinanceNodes: {
      kind: 'READ',
      tool: tool({
        description:
          'List finance nodes (accounts, wallets, cards, external entities, contacts). Optional filters: type (OWN|EXTERNAL|CONTACT) and archived (true|false).',
        inputSchema: z.object({
          type: z.enum(['OWN', 'EXTERNAL', 'CONTACT']).nullish(),
          archived: z.boolean().nullish(),
        }),
        execute: ({ type, archived }) =>
          safe(() => backend.get('/finance-nodes', { type, archived })),
      }),
    },

    getNodeById: {
      kind: 'READ',
      tool: tool({
        description: 'Get a single finance node by its ID.',
        inputSchema: z.object({ id: z.number() }),
        execute: ({ id }) => safe(() => backend.get(`/finance-nodes/${id}`)),
      }),
    },

    getNodeBalance: {
      kind: 'READ',
      tool: tool({
        description: 'Get the current balance of a finance node (sum of all its line-item amounts).',
        inputSchema: z.object({ nodeId: z.number() }),
        execute: ({ nodeId }) => safe(() => backend.get(`/finance-nodes/${nodeId}/balance`)),
      }),
    },

    getCategories: {
      kind: 'READ',
      tool: tool({
        description: 'List budget categories. Optional archived filter.',
        inputSchema: z.object({ archived: z.boolean().nullish() }),
        execute: ({ archived }) => safe(() => backend.get('/categories', { archived })),
      }),
    },

    getTags: {
      kind: 'READ',
      tool: tool({
        description: 'List tags. Optional archived filter.',
        inputSchema: z.object({ archived: z.boolean().nullish() }),
        execute: ({ archived }) => safe(() => backend.get('/tags', { archived })),
      }),
    },

    getTagGroups: {
      kind: 'READ',
      tool: tool({
        description: 'List tag groups with their tags.',
        inputSchema: z.object({ archived: z.boolean().nullish() }),
        execute: ({ archived }) => safe(() => backend.get('/tag-groups', { archived })),
      }),
    },

    getRecentEvents: {
      kind: 'READ',
      tool: tool({
        description: 'List the most recent finance events ordered by date descending. Provide a limit between 1 and 50.',
        inputSchema: z.object({ limit: z.number().min(1).max(50).default(10) }),
        execute: ({ limit }) =>
          safe(async () => (await backend.get<Paged<unknown>>('/events', { page: 0, size: limit })).content),
      }),
    },

    getEventById: {
      kind: 'READ',
      tool: tool({
        description: 'Get a single finance event by its ID, including line items, category and tags.',
        inputSchema: z.object({ id: z.number() }),
        execute: ({ id }) => safe(() => backend.get(`/events/${id}`)),
      }),
    },

    searchEvents: {
      kind: 'READ',
      tool: tool({
        description:
          'Search finance events with optional filters: text search, date range (YYYY-MM-DD), type (INBOUND|OUTBOUND|OTHER), categoryId, tagId, nodeId, and min/max amount.',
        inputSchema: z.object({
          search: z.string().nullish(),
          startDate: z.string().nullish(),
          endDate: z.string().nullish(),
          type: z.enum(['INBOUND', 'OUTBOUND', 'OTHER']).nullish(),
          categoryId: z.number().nullish(),
          tagId: z.number().nullish(),
          nodeId: z.number().nullish(),
          minAmount: z.number().nullish(),
          maxAmount: z.number().nullish(),
          limit: z.number().min(1).max(50).default(50),
        }),
        execute: ({ search, startDate, endDate, type, categoryId, tagId, nodeId, minAmount, maxAmount, limit }) =>
          safe(async () =>
            (
              await backend.get<Paged<unknown>>('/events', {
                page: 0,
                size: limit,
                search,
                startDate: startDate ? startDate.slice(0, 10) : undefined,
                endDate: endDate ? endDate.slice(0, 10) : undefined,
                type,
                categoryId,
                tagId,
                nodeId,
                minAmount,
                maxAmount,
              })
            ).content,
          ),
      }),
    },

    searchSimilarEvents: {
      kind: 'READ',
      tool: tool({
        description:
          'Find past events similar to the one being created, to ground a good name/description. Filter by categoryId, a text query, and/or an amount range (±tolerance applied automatically).',
        inputSchema: z.object({
          query: z.string().nullish(),
          categoryId: z.number().nullish(),
          amount: z.number().nullish(),
          limit: z.number().min(1).max(20).default(8),
        }),
        execute: ({ query, categoryId, amount, limit }) =>
          safe(async () => {
            const tolerance = amount != null ? Math.max(amount * 0.25, 1) : undefined;
            return (
              await backend.get<Paged<unknown>>('/events', {
                page: 0,
                size: limit,
                search: query,
                categoryId,
                minAmount: amount != null && tolerance != null ? amount - tolerance : undefined,
                maxAmount: amount != null && tolerance != null ? amount + tolerance : undefined,
              })
            ).content;
          }),
      }),
    },

    getTimePeriods: {
      kind: 'READ',
      tool: tool({
        description: 'List time periods (budget containers) with start/end date, budget limit and savings goal.',
        inputSchema: z.object({}),
        execute: () =>
          safe(async () => (await backend.get<Paged<unknown>>('/time-periods', { page: 0, size: 100 })).content),
      }),
    },

    getActiveTimePeriod: {
      kind: 'READ',
      tool: tool({
        description: 'Get the time period whose date range includes today, or null if none is active.',
        inputSchema: z.object({}),
        execute: () =>
          safe(async () => {
            const periods = (await backend.get<Paged<Record<string, string>>>('/time-periods', { page: 0, size: 100 })).content;
            const today = new Date().toISOString().slice(0, 10);
            return (
              periods.find((p) => p.startDate?.slice(0, 10) <= today && today <= p.endDate?.slice(0, 10)) ??
              { message: 'No active time period for today.' }
            );
          }),
      }),
    },

    getTimePeriodBalance: {
      kind: 'READ',
      tool: tool({
        description: 'Get income, outbound and per-category budget balance for a time period.',
        inputSchema: z.object({ periodId: z.number() }),
        execute: ({ periodId }) => safe(() => backend.get(`/time-periods/${periodId}/balance`)),
      }),
    },

    getSubscriptions: {
      kind: 'READ',
      tool: tool({
        description: 'List subscriptions. Optional active filter (true = ACTIVE only, false = non-active).',
        inputSchema: z.object({ active: z.boolean().nullish() }),
        execute: ({ active }) =>
          safe(async () => {
            const subs = (await backend.get<Paged<Record<string, unknown>>>('/subscriptions', { page: 0, size: 100 })).content;
            if (active == null) return subs;
            return subs.filter((s) => (active ? s.status === 'ACTIVE' : s.status !== 'ACTIVE'));
          }),
      }),
    },

    getTemplates: {
      kind: 'READ',
      tool: tool({
        description: 'List event templates, optionally filtered by a search term in the name.',
        inputSchema: z.object({ search: z.string().nullish() }),
        execute: ({ search }) =>
          safe(async () => {
            const templates = (await backend.get<Paged<Record<string, string>>>('/templates', { page: 0, size: 100 })).content;
            if (!search) return templates;
            const lower = search.toLowerCase();
            return templates.filter((t) => t.name?.toLowerCase().includes(lower));
          }),
      }),
    },

    getTemplateById: {
      kind: 'READ',
      tool: tool({
        description: 'Get a single event template by ID, including its default nodes, category, tags and modifiers.',
        inputSchema: z.object({ id: z.number() }),
        execute: ({ id }) => safe(() => backend.get(`/templates/${id}`)),
      }),
    },

    getDrafts: {
      kind: 'READ',
      tool: tool({
        description: 'List draft (incomplete) finance events pending user completion or confirmation.',
        inputSchema: z.object({}),
        execute: () => safe(() => backend.get('/drafts/finance-events')),
      }),
    },

    // ===================== WRITE =====================
    createDraftEvent: {
      kind: 'DRAFT_WRITE',
      tool: tool({
        description:
          'Create a DRAFT finance event from structured data. Gather amount, source node (money out), destination node (money in), category, tags and date first. The draft is saved for the user to review; it does NOT post a real event. Create one draft per transaction.',
        inputSchema: z.object({
          name: z.string(),
          description: z.string().nullish(),
          amount: z.number().positive(),
          sourceNodeId: z.number().nullish(),
          destinationNodeId: z.number().nullish(),
          categoryId: z.number().nullish(),
          tagIds: z.array(z.number()).nullish(),
          transactionDate: z.string().nullish(),
          type: z.enum(['INBOUND', 'OUTBOUND', 'OTHER']).default('OUTBOUND'),
        }),
        execute: ({ name, description, amount, sourceNodeId, destinationNodeId, categoryId, tagIds, transactionDate, type }) =>
          safe(() =>
            backend.post('/drafts/finance-events', {
              name,
              description: description ?? null,
              type,
              transactionDate: normalizeTransactionDate(transactionDate ?? undefined, ctx.timezone) ?? null,
              category: categoryId != null ? { id: categoryId } : null,
              tags: (tagIds ?? []).map((id) => ({ id })),
              lineItems: [
                { financeNodeId: sourceNodeId ?? null, amount: -amount },
                { financeNodeId: destinationNodeId ?? null, amount },
              ],
            }),
          ),
      }),
    },

    updateEvent: {
      kind: 'WRITE',
      tool: tool({
        description:
          'Edit an existing finance event. Only the provided fields change. Supports name, description, type, category, tags, transaction date, amount and the source/destination nodes.',
        inputSchema: z.object({
          eventId: z.number(),
          name: z.string().nullish(),
          description: z.string().nullish(),
          type: z.enum(['INBOUND', 'OUTBOUND', 'OTHER']).nullish(),
          categoryId: z.number().nullish(),
          tagIds: z.array(z.number()).nullish(),
          transactionDate: z.string().nullish(),
          amount: z.number().positive().nullish(),
          sourceNodeId: z.number().nullish(),
          destinationNodeId: z.number().nullish(),
        }),
        execute: (args) =>
          safe(async () => {
            const patch: Record<string, unknown> = {};
            if (args.name != null) patch.name = args.name;
            if (args.description != null) patch.description = args.description;
            if (args.type != null) patch.type = args.type;
            if (args.categoryId != null) patch.category = { id: args.categoryId };
            if (args.tagIds != null) patch.tags = args.tagIds.map((id) => ({ id }));

            const wantsTransaction =
              args.transactionDate != null || args.amount != null || args.sourceNodeId != null || args.destinationNodeId != null;
            if (wantsTransaction) {
              const current = await backend.get<{
                transactionDate?: string;
                lineItems?: Array<{ financeNodeId: number; amount: number }>;
              }>(`/events/${args.eventId}`);
              const existing = current.lineItems ?? [];
              const source = existing.find((li) => li.amount < 0);
              const dest = existing.find((li) => li.amount >= 0);
              const amount = args.amount ?? (dest?.amount ?? (source ? -source.amount : 0));
              const sourceNodeId = args.sourceNodeId ?? source?.financeNodeId ?? null;
              const destNodeId = args.destinationNodeId ?? dest?.financeNodeId ?? null;
              patch.transaction = {
                transactionDate:
                  normalizeTransactionDate(args.transactionDate ?? undefined, ctx.timezone) ??
                  current.transactionDate ??
                  null,
                lineItems: [
                  { financeNode: sourceNodeId != null ? { id: sourceNodeId } : null, amount: -Math.abs(amount) },
                  { financeNode: destNodeId != null ? { id: destNodeId } : null, amount: Math.abs(amount) },
                ],
              };
            }
            return backend.patch(`/events/${args.eventId}`, patch);
          }),
      }),
    },

    updateEventCategory: {
      kind: 'WRITE',
      tool: tool({
        description: 'Set the category of an existing finance event.',
        inputSchema: z.object({ eventId: z.number(), categoryId: z.number() }),
        execute: ({ eventId, categoryId }) =>
          safe(() => backend.patch(`/events/${eventId}`, { category: { id: categoryId } })),
      }),
    },

    addTagsToEvent: {
      kind: 'WRITE',
      tool: tool({
        description: 'Add tags to an existing finance event (merges with existing tags).',
        inputSchema: z.object({ eventId: z.number(), tagIds: z.array(z.number()).min(1) }),
        execute: ({ eventId, tagIds }) =>
          safe(async () => {
            const event = await backend.get<{ tags?: Array<{ id: number }> }>(`/events/${eventId}`);
            const current = new Map((event.tags ?? []).map((t) => [t.id, t]));
            for (const id of tagIds) current.set(id, { id });
            return backend.patch(`/events/${eventId}`, { tags: Array.from(current.values()) });
          }),
      }),
    },

    archiveNode: {
      kind: 'WRITE',
      tool: tool({
        description: 'Archive a finance node. Archived nodes are hidden but preserved for historical calculations.',
        inputSchema: z.object({ nodeId: z.number() }),
        execute: ({ nodeId }) => safe(() => backend.post(`/finance-nodes/${nodeId}/archive`)),
      }),
    },

    triggerSubscription: {
      kind: 'WRITE',
      tool: tool({
        description: 'Execute a subscription now, generating a new finance event from its template.',
        inputSchema: z.object({ subscriptionId: z.number() }),
        execute: ({ subscriptionId }) => safe(() => backend.post(`/subscriptions/${subscriptionId}/execute`)),
      }),
    },

    cancelSubscription: {
      kind: 'WRITE',
      tool: tool({
        description: 'Cancel a subscription, stopping future automatic event generation.',
        inputSchema: z.object({ subscriptionId: z.number() }),
        execute: ({ subscriptionId }) => safe(() => backend.post(`/subscriptions/${subscriptionId}/cancel`)),
      }),
    },

    // ===================== DRAFT_CONFIRM =====================
    getDraftDetails: {
      kind: 'DRAFT_CONFIRM',
      tool: tool({
        description: 'Inspect the full details of a draft finance event by its draft ID before confirming or rejecting it.',
        inputSchema: z.object({ draftId: z.number() }),
        execute: ({ draftId }) =>
          safe(async () => {
            const drafts = await backend.get<Array<{ draftId: number }>>('/drafts/finance-events');
            const draft = drafts.find((d) => d.draftId === draftId);
            return draft ?? { error: `Draft not found: ${draftId}` };
          }),
      }),
    },

    confirmDraft: {
      kind: 'DRAFT_CONFIRM',
      tool: tool({
        description: 'Confirm a draft finance event, converting it into a real finance event. Requires a complete draft.',
        inputSchema: z.object({ draftId: z.number() }),
        execute: ({ draftId }) => safe(() => backend.post(`/drafts/finance-events/${draftId}/confirm`)),
      }),
    },

    rejectDraft: {
      kind: 'DRAFT_CONFIRM',
      tool: tool({
        description: 'Reject and delete a draft finance event that is incorrect, duplicate or not needed.',
        inputSchema: z.object({ draftId: z.number(), reason: z.string().nullish() }),
        execute: ({ draftId }) => safe(() => backend.del(`/drafts/${draftId}`)),
      }),
    },
  };
}
