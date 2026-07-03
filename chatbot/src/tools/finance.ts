import { tool } from 'ai';
import { z } from 'zod';
import { BackendError, createApiClient, patchEvent, unwrap, type FinanceEventDto } from '@/backend/client.js';
import { botEventFilterSchema, botEventInputSchema, botEventPatchSchema } from '@/bot/dto.js';
import { toBotDraft, toBotEvent, toDraftPayload, toEventPatch, toServerDateBoundary } from '@/bot/mappers.js';
import type { RequestContext } from '@/context.js';
import type { KindedToolSet } from '@/tools/types.js';

async function safe<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof BackendError ? e.message : (e as Error).message;
    return { error: message };
  }
}

export function buildFinanceTools(ctx: RequestContext): KindedToolSet {
  const client = createApiClient(ctx);

  return {
    // ===================== READ: reference data =====================
    listCategories: {
      kind: 'READ',
      tool: tool({
        description: 'List budget categories. Optional archived filter.',
        inputSchema: z.object({ archived: z.boolean().nullish() }),
        execute: ({ archived }) =>
          safe(() => unwrap(client.GET('/categories', { params: { query: { archived: archived ?? undefined } } }))),
      }),
    },

    listTags: {
      kind: 'READ',
      tool: tool({
        description: 'List tags. Optional archived filter.',
        inputSchema: z.object({ archived: z.boolean().nullish() }),
        execute: ({ archived }) =>
          safe(() => unwrap(client.GET('/tags', { params: { query: { archived: archived ?? undefined } } }))),
      }),
    },

    listTagGroups: {
      kind: 'READ',
      tool: tool({
        description: 'List tag groups with their tags.',
        inputSchema: z.object({ archived: z.boolean().nullish() }),
        execute: ({ archived }) =>
          safe(() => unwrap(client.GET('/tag-groups', { params: { query: { archived: archived ?? undefined } } }))),
      }),
    },

    listNodes: {
      kind: 'READ',
      tool: tool({
        description:
          'List finance nodes (accounts, wallets, cards, external entities, contacts) to resolve names to IDs when building events. Optional filters: type (OWN|EXTERNAL|CONTACT) and archived.',
        inputSchema: z.object({
          type: z.enum(['OWN', 'EXTERNAL', 'CONTACT']).nullish(),
          archived: z.boolean().nullish(),
        }),
        execute: ({ type, archived }) =>
          safe(() =>
            unwrap(client.GET('/finance-nodes', { params: { query: { type: type ?? undefined, archived: archived ?? undefined } } })),
          ),
      }),
    },

    // ===================== READ: events =====================
    searchEvents: {
      kind: 'READ',
      tool: tool({
        description:
          'Search finance events with advanced filters: text search, date range (YYYY-MM-DD), type (INBOUND|OUTBOUND|OTHER), categoryId, tagId, nodeId, and min/max amount. Returns flat events.',
        inputSchema: botEventFilterSchema,
        execute: ({ search, startDate, endDate, type, categoryId, tagId, nodeId, minAmount, maxAmount, limit }) =>
          safe(async () => {
            const page = await unwrap(
              client.GET('/events', {
                params: {
                  query: {
                    page: 0,
                    size: limit,
                    search: search ?? undefined,
                    startDate: toServerDateBoundary(startDate, ctx.timezone, 'start'),
                    endDate: toServerDateBoundary(endDate, ctx.timezone, 'end'),
                    type: type ?? undefined,
                    categoryId: categoryId ?? undefined,
                    tagId: tagId ?? undefined,
                    nodeId: nodeId ?? undefined,
                    minAmount: minAmount ?? undefined,
                    maxAmount: maxAmount ?? undefined,
                  },
                },
              }),
            );
            return ((page.content ?? []) as FinanceEventDto[]).map(toBotEvent);
          }),
      }),
    },

    getEvent: {
      kind: 'READ',
      tool: tool({
        description: 'Get a single finance event by its ID as a flat event.',
        inputSchema: z.object({ id: z.number() }),
        execute: ({ id }) =>
          safe(async () => toBotEvent(await unwrap(client.GET('/events/{id}', { params: { path: { id } } })))),
      }),
    },

    // ===================== READ: drafts =====================
    listDrafts: {
      kind: 'READ',
      tool: tool({
        description:
          'List draft (pending) finance events. Each draft has a draftId; originalEventId is set when the draft edits an existing event.',
        inputSchema: z.object({}),
        execute: () =>
          safe(async () => (await unwrap(client.GET('/drafts/finance-events'))).map(toBotDraft)),
      }),
    },

    getDraft: {
      kind: 'READ',
      tool: tool({
        description: 'Get a single draft finance event by its draftId.',
        inputSchema: z.object({ draftId: z.number() }),
        execute: ({ draftId }) =>
          safe(async () => {
            const drafts = await unwrap(client.GET('/drafts/finance-events'));
            const draft = drafts.find((d) => d.draftId === draftId);
            return draft ? toBotDraft(draft) : { error: `Draft not found: ${draftId}` };
          }),
      }),
    },

    // ===================== SHOW (UI signal) =====================
    showEntity: {
      kind: 'READ',
      tool: tool({
        description:
          'Show an event, draft, tag or category to the user as a clickable card in the chat, so they can open it directly. ' +
          'Call this any time you mention a specific entity the user might want to view — after searching, reading, creating or ' +
          'editing it — not only right after a write. For drafts, id is the draftId (not the original event id).',
        inputSchema: z.object({ entityType: z.enum(['event', 'draft', 'tag', 'category']), id: z.number() }),
        execute: ({ entityType, id }) =>
          safe(async () => {
            if (entityType === 'event') {
              const event = toBotEvent(await unwrap(client.GET('/events/{id}', { params: { path: { id } } })));
              return { entityType, id: event.id, name: event.name };
            }
            if (entityType === 'draft') {
              const drafts = await unwrap(client.GET('/drafts/finance-events'));
              const draft = drafts.find((d) => d.draftId === id);
              if (!draft) return { error: `Draft not found: ${id}` };
              return { entityType, id, name: draft.name };
            }
            if (entityType === 'tag') {
              const tag = await unwrap(client.GET('/tags/{id}', { params: { path: { id } } }));
              return { entityType, id: tag.id, name: tag.name };
            }
            const category = await unwrap(client.GET('/categories/{id}', { params: { path: { id } } }));
            return { entityType, id: category.id, name: category.name };
          }),
      }),
    },

    // ===================== DRAFT WRITE =====================
    createDraft: {
      kind: 'DRAFT_WRITE',
      tool: tool({
        description:
          'Create a DRAFT finance event from flat data (the user confirms it later; it does NOT post a real event). ' +
          'Set targetEventId to propose an EDIT to an existing event as a draft (left pending). ' +
          'Provide amount, source node (money out), destination node (money in), category, tags and date. One draft per transaction.',
        inputSchema: botEventInputSchema.extend({ targetEventId: z.number().nullish() }),
        execute: ({ targetEventId, ...input }) =>
          safe(async () => {
            const created = await unwrap(
              client.POST('/drafts/finance-events', { body: toDraftPayload(input, ctx.timezone, targetEventId ?? undefined) }),
            );
            return { ok: true, draftId: created.id, originalEventId: created.originalEntityId ?? undefined };
          }),
      }),
    },

    updateDraft: {
      kind: 'DRAFT_WRITE',
      tool: tool({
        description: 'Replace the contents of an existing draft (by draftId) with new flat data.',
        inputSchema: botEventInputSchema.extend({ draftId: z.number(), targetEventId: z.number().nullish() }),
        execute: ({ draftId, targetEventId, ...input }) =>
          safe(async () => {
            const updated = await unwrap(
              client.PUT('/drafts/finance-events/{id}', {
                params: { path: { id: draftId } },
                body: toDraftPayload(input, ctx.timezone, targetEventId ?? undefined),
              }),
            );
            return { ok: true, draftId: updated.id, originalEventId: updated.originalEntityId ?? undefined };
          }),
      }),
    },

    deleteDraft: {
      kind: 'DRAFT_WRITE',
      tool: tool({
        description: 'Delete a draft finance event that is incorrect, duplicate or not needed.',
        inputSchema: z.object({ draftId: z.number() }),
        execute: ({ draftId }) =>
          safe(async () => {
            await unwrap(client.DELETE('/drafts/{id}', { params: { path: { id: draftId } } }));
            return { ok: true, deletedDraftId: draftId };
          }),
      }),
    },

    // ===================== DRAFT CONFIRM =====================
    confirmDraft: {
      kind: 'DRAFT_CONFIRM',
      tool: tool({
        description:
          'Confirm a draft, creating a NEW real finance event from it. Note: this always CREATES a new event — to apply an edit to an existing event use updateEvent, not confirm.',
        inputSchema: z.object({ draftId: z.number() }),
        execute: ({ draftId }) =>
          safe(async () => ({
            ...toBotEvent(
              await unwrap(client.POST('/drafts/finance-events/{id}/confirm', { params: { path: { id: draftId } } })),
            ),
            confirmedDraftId: draftId,
          })),
      }),
    },

    // ===================== WRITE: events =====================
    updateEvent: {
      kind: 'WRITE',
      tool: tool({
        description:
          'Edit an existing finance event in place. Only the provided fields change; supports name, description, type, category, tags, date, amount and source/destination nodes.',
        inputSchema: botEventPatchSchema,
        execute: (patch) =>
          safe(async () => {
            const wantsTransaction =
              patch.date != null || patch.amount != null || patch.sourceNodeId != null || patch.destNodeId != null;
            const current = wantsTransaction
              ? await unwrap(client.GET('/events/{id}', { params: { path: { id: patch.eventId } } }))
              : ({} as FinanceEventDto);
            const body = toEventPatch(patch, current, ctx.timezone);
            return toBotEvent(await unwrap(patchEvent(client, patch.eventId, body)));
          }),
      }),
    },
  } satisfies KindedToolSet;
}
