import { tool } from 'ai';
import { z } from 'zod';
import { BackendError, createApiClient, patchEvent, unwrap, type FinanceEventDto } from '@/backend/client.js';
import { botDraftPatchSchema, botEventFilterSchema, botEventInputSchema, botEventPatchSchema, lenientBoolean } from '@/bot/dto.js';
import { toBotDraft, toBotEvent, toDraftPatchPayload, toDraftPayload, toEventPatch, toServerDateBoundary } from '@/bot/mappers.js';
import type { RequestContext } from '@/context.js';
import { EVENT_MUTATION_DOMAINS, type KindedToolSet } from '@/tools/types.js';

async function safe<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof BackendError ? e.message : (e as Error).message;
    return { error: message };
  }
}

async function patchDraftById(
  client: ReturnType<typeof createApiClient>,
  draftId: number,
  patch: Omit<z.infer<typeof botDraftPatchSchema>, 'draftId'>,
  timezone: string,
) {
  const updated = await unwrap(
    client.PATCH('/drafts/finance-events/{id}', {
      params: { path: { id: draftId } },
      body: toDraftPatchPayload(patch, timezone),
    }),
  );
  return { ok: true, draftId: updated.id, originalEventId: updated.originalEntityId ?? undefined };
}

/**
 * Upserts the single draft linked to an already-existing event, mirroring the backend's
 * one-draft-per-event rule — the model must never spawn a second draft for the same event.
 */
async function upsertDraftForEvent(
  client: ReturnType<typeof createApiClient>,
  eventId: number,
  input: Omit<z.infer<typeof botDraftPatchSchema>, 'draftId' | 'targetEventId'>,
  timezone: string,
) {
  const updated = await unwrap(
    client.PUT('/drafts/finance-events/by-entity/{entityId}', {
      params: { path: { entityId: eventId } },
      body: toDraftPatchPayload({ ...input, targetEventId: eventId }, timezone),
    }),
  );
  return { ok: true, draftId: updated.id, originalEventId: updated.originalEntityId ?? undefined };
}

export function buildFinanceTools(ctx: RequestContext): KindedToolSet {
  const client = createApiClient(ctx);
  // When the chat is scoped to a draft/event open in a form (ctx.scope), the write tools below are
  // hard-clamped to that id regardless of what the model passes — the model can request a change, but it
  // can never target or create a different entity than the one on screen. This makes form edits deterministic
  // instead of relying on the model reliably choosing the right id/tool from prompt guidance alone.
  const scope = ctx.scope;

  return {
    // ===================== READ: reference data =====================
    listCategories: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking budget categories...', es: 'Consultando categorías de presupuesto...' } },
      tool: tool({
        description: 'List budget categories. Optional archived filter.',
        inputSchema: z.object({ archived: lenientBoolean.nullish() }),
        execute: ({ archived }) =>
          safe(() => unwrap(client.GET('/categories', { params: { query: { archived: archived ?? undefined } } }))),
      }),
    },

    listTags: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking tags...', es: 'Consultando etiquetas...' } },
      tool: tool({
        description: 'List tags. Optional archived filter.',
        inputSchema: z.object({ archived: lenientBoolean.nullish() }),
        execute: ({ archived }) =>
          safe(() => unwrap(client.GET('/tags', { params: { query: { archived: archived ?? undefined } } }))),
      }),
    },

    listTagGroups: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking tag groups...', es: 'Consultando grupos de etiquetas...' } },
      tool: tool({
        description: 'List tag groups with their tags.',
        inputSchema: z.object({ archived: lenientBoolean.nullish() }),
        execute: ({ archived }) =>
          safe(() => unwrap(client.GET('/tag-groups', { params: { query: { archived: archived ?? undefined } } }))),
      }),
    },

    listNodes: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking accounts and nodes...', es: 'Consultando cuentas y entidades...' } },
      tool: tool({
        description:
          'List finance nodes (accounts, wallets, cards, external entities, contacts) to resolve names to IDs when building events. Optional filters: type (OWN|EXTERNAL|CONTACT) and archived.',
        inputSchema: z.object({
          type: z.enum(['OWN', 'EXTERNAL', 'CONTACT']).nullish(),
          archived: lenientBoolean.nullish(),
        }),
        execute: ({ type, archived }) =>
          safe(() =>
            unwrap(client.GET('/finance-nodes', { params: { query: { type: type ?? undefined, archived: archived ?? undefined } } })),
          ),
      }),
    },

    listTemplates: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking templates...', es: 'Consultando plantillas...' } },
      tool: tool({
        description:
          'List predefined templates that can be used to quickly generate finance events. Templates define default nodes, categories, and tags, and sometimes dynamic mathematical modifiers. Use this tool when the user mentions creating an event from a template (e.g. "my rent", "the usual"). By fetching the templates, you can determine what fields (like amount or specific nodes) are still required to build the event.',
        inputSchema: z.object({}),
        execute: () => safe(() => unwrap(client.GET('/templates', { params: { query: { page: 0, size: 100 } } }))),
      }),
    },

    // ===================== READ: events =====================
    searchEvents: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Searching transaction history...', es: 'Buscando movimientos en el historial...' } },
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
      ui: { invalidates: [], label: { en: 'Retrieving transaction details...', es: 'Obteniendo detalles del movimiento...' } },
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
      ui: { invalidates: [], label: { en: 'Listing pending drafts...', es: 'Listando borradores pendientes...' } },
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
      ui: { invalidates: [], label: { en: 'Retrieving draft details...', es: 'Obteniendo borrador...' } },
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
      ui: { invalidates: [], label: { en: 'Preparing to show...', es: 'Preparando para mostrar...' } },
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
      ui: { invalidates: ['drafts'], patchesForm: true, label: { en: 'Creating draft event...', es: 'Creando borrador de transacción...' } },
      tool: tool({
        description:
          'Create a DRAFT finance event (the user confirms it later; it does NOT post a real event). ' +
          'To propose an EDIT to an existing event, you MUST set targetEventId to that event\'s id. ' +
          'CRITICAL: omitting targetEventId when your intent is to edit an existing event does NOT stage a safe ' +
          'no-op — confirming that draft creates a brand-new duplicate event instead of updating the original. ' +
          'If you are unsure whether you are editing or creating, resolve the event id first (searchEvents/getEvent) ' +
          'and pass targetEventId. Provide the full lineItems list (2 for a simple purchase, 3+ for a split), ' +
          'category, tags and date.',
        inputSchema: botEventInputSchema.extend({ targetEventId: z.number().nullish() }),
        execute: ({ targetEventId, ...input }) =>
          safe(async () => {
            // A draft is already open in the form: never spawn a second one, always fold the request into it.
            if (scope?.type === 'draft') {
              return patchDraftById(client, scope.id, { targetEventId, ...input }, ctx.timezone);
            }
            const resolvedTargetEventId = scope?.type === 'event' ? scope.id : (targetEventId ?? undefined);
            // Targeting an existing event: upsert its single draft instead of a blind create, so the
            // model can never end up with two drafts pointing at the same event.
            if (resolvedTargetEventId) {
              return upsertDraftForEvent(client, resolvedTargetEventId, input, ctx.timezone);
            }
            const created = await unwrap(
              client.POST('/drafts/finance-events', { body: toDraftPayload(input, ctx.timezone) }),
            );
            return { ok: true, draftId: created.id, originalEventId: created.originalEntityId ?? undefined };
          }),
      }),
    },

    updateDraft: {
      kind: 'DRAFT_WRITE',
      ui: { invalidates: ['drafts'], patchesForm: true, label: { en: 'Updating draft event...', es: 'Actualizando borrador...' } },
      tool: tool({
        description:
          'Edit an existing draft (by draftId). Only the fields you provide change; every field you omit keeps its ' +
          'current value (send just the tag, date, etc. you want to change, not the whole draft). To change the ' +
          'amount or a node, send the FULL lineItems list (fetch it with getDraft first if you only need to tweak ' +
          'one item) — it always replaces the current list wholesale, it does not merge item-by-item. ' +
          'Set targetEventId to (re)link the draft as an edit of an existing event.',
        inputSchema: botDraftPatchSchema,
        execute: ({ draftId, ...patch }) =>
          // The scoped draft id always wins over whatever draftId the model picked, so an open form can
          // never be silently patched onto the wrong draft.
          safe(() => patchDraftById(client, scope?.type === 'draft' ? scope.id : draftId, patch, ctx.timezone)),
      }),
    },

    deleteDraft: {
      kind: 'DRAFT_WRITE',
      ui: { invalidates: ['drafts'], label: { en: 'Deleting draft event...', es: 'Eliminando borrador...' } },
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

    // ===================== DRAFT VALIDATE =====================
    validateDraft: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking draft...', es: 'Revisando borrador...' } },
      tool: tool({
        description:
          'Check a draft for validation errors (missing name/date, unbalanced line items, missing/archived ' +
          'finance nodes, future date) WITHOUT confirming it. Use this before confirmDraft when unsure the draft ' +
          'is complete, or when the user asks whether a draft is ready.',
        inputSchema: z.object({ draftId: z.number() }),
        execute: ({ draftId }) =>
          safe(() => unwrap(client.POST('/drafts/finance-events/{id}/validate', { params: { path: { id: draftId } } }))),
      }),
    },

    // ===================== DRAFT CONFIRM =====================
    confirmDraft: {
      kind: 'DRAFT_CONFIRM',
      ui: { invalidates: EVENT_MUTATION_DOMAINS, label: { en: 'Confirming draft event...', es: 'Confirmando borrador...' } },
      tool: tool({
        description:
          'Confirm a draft, publishing it as a real finance event. MERGE (default) updates the linked event in ' +
          'place when the draft has one (originalEventId set); CREATE_ONLY always creates a brand new event instead.',
        inputSchema: z.object({ draftId: z.number(), mode: z.enum(['MERGE', 'CREATE_ONLY']).nullish() }),
        execute: ({ draftId, mode }) =>
          safe(async () => {
            const result = await unwrap(
              client.POST('/drafts/finance-events/confirm-batch', {
                body: { draftIds: [draftId], mode: mode ?? 'MERGE' },
              }),
            );
            if (result.failedDraftIds?.includes(draftId)) {
              return { error: `Draft incomplete or not found: ${draftId}` };
            }
            return { ...toBotEvent(result.confirmedEvents[0]), confirmedDraftId: draftId };
          }),
      }),
    },

    // ===================== WRITE: events =====================
    updateEvent: {
      kind: 'WRITE',
      ui: { invalidates: EVENT_MUTATION_DOMAINS, patchesForm: true, label: { en: 'Updating transaction details...', es: 'Actualizando detalles de la transacción...' } },
      tool: tool({
        description:
          'Edit an existing finance event in place. Only the provided fields change; supports name, description, ' +
          'type, category, tags, date and lineItems. To change the amount or a node, send the FULL lineItems list ' +
          '(fetch it with getEvent first if you only need to tweak one item) — it always replaces the current list ' +
          'wholesale, it does not merge item-by-item.',
        inputSchema: botEventPatchSchema,
        execute: ({ eventId, ...patch }) =>
          safe(async () => {
            // The scoped event id always wins over whatever eventId the model picked, so an open form can
            // never be silently patched onto the wrong event.
            const resolvedEventId = scope?.type === 'event' ? scope.id : eventId;
            const wantsTransaction = patch.date != null || patch.lineItems != null;
            const current = wantsTransaction
              ? await unwrap(client.GET('/events/{id}', { params: { path: { id: resolvedEventId } } }))
              : ({} as FinanceEventDto);
            const body = toEventPatch({ eventId: resolvedEventId, ...patch }, current, ctx.timezone);
            return toBotEvent(await unwrap(patchEvent(client, resolvedEventId, body)));
          }),
      }),
    },
  } satisfies KindedToolSet;
}
