import { tool } from 'ai';
import { z } from 'zod';
import { BackendError, createApiClient, unwrap, type ApiClient } from '@/backend/client.js';
import {
  botCustomPlanInputSchema,
  botEventGroupInputSchema,
  botInstallmentPlanInputSchema,
  botPaymentPlanItemPatchSchema,
  botPaymentPlanPatchSchema,
  botRecurringPlanInputSchema,
  NumericId,
} from '@/bot/dto.js';
import type { RequestContext } from '@/context.js';
import type { CacheDomain, KindedToolSet } from '@/tools/types.js';

const PLAN_MUTATION_DOMAINS: readonly CacheDomain[] = ['paymentPlans'];
const PLAN_LINK_DOMAINS: readonly CacheDomain[] = ['paymentPlans', 'events', 'drafts'];

type PaymentPlan = Awaited<ReturnType<typeof fetchPlan>>;
type PaymentPlanItem = NonNullable<PaymentPlan['items']>[number];

async function safe<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof BackendError ? e.message : (e as Error).message;
    return { error: message };
  }
}

function fetchPlan(client: ApiClient, planId: number) {
  return unwrap(client.GET('/payment-plans/{id}', { params: { path: { id: planId } } }));
}

/**
 * An entry of these kinds exists only to hold its link, so removing the link deletes it. A cuota
 * or a subscription cycle keeps its slot in the schedule and goes back to pending instead.
 */
function hasLinkOnlyItems(plan: PaymentPlan): boolean {
  return plan.planType === 'CUSTOM' || plan.planType === 'GROUP';
}

/** An installment plan is finite by definition: it can never hold more cuotas than it declares. */
function hasRoomForAnotherItem(plan: PaymentPlan): boolean {
  if (plan.planType !== 'INSTALLMENT') return true;
  return (plan.items ?? []).length < (plan.totalInstallments ?? 0);
}

function findItem(plan: PaymentPlan, itemId: number): PaymentPlanItem | undefined {
  return (plan.items ?? []).find((item) => item.id === itemId);
}

function nextInstallmentNumber(plan: PaymentPlan): number {
  return (plan.items ?? []).reduce((max, item) => Math.max(max, item.installmentNumber ?? 0), 0) + 1;
}

/**
 * The backend replaces a plan wholesale on PUT, so every partial edit has to be merged onto the
 * current plan first. Sending only the changed fields would silently blank out everything else.
 */
function mergePlanPatch(plan: PaymentPlan, patch: z.infer<typeof botPaymentPlanPatchSchema>) {
  return {
    name: patch.name ?? plan.name,
    description: patch.description ?? plan.description ?? undefined,
    planType: plan.planType,
    status: patch.status ?? plan.status,
    startDate: patch.startDate ?? plan.startDate,
    frequency: patch.frequency ?? plan.frequency,
    endDate: patch.endDate ?? plan.endDate ?? undefined,
    totalInstallments: patch.totalInstallments ?? plan.totalInstallments ?? undefined,
    totalAmount: patch.totalAmount ?? plan.totalAmount ?? undefined,
    installmentAmount: patch.installmentAmount ?? plan.installmentAmount ?? undefined,
    isAutomated: patch.isAutomated ?? plan.isAutomated,
    autoCreateDraft: plan.autoCreateDraft,
    templateId: patch.templateId ?? plan.template?.id ?? undefined,
    categoryId: patch.categoryId ?? plan.category?.id ?? undefined,
    tagIds: patch.tagIds ?? (plan.tags ?? []).map((tag) => tag.id).filter((id): id is number => id != null),
  };
}

/**
 * Same wholesale-replace rule applies to items, and it extends to their links: a PUT without
 * eventId/draftId unlinks the item. Every item edit therefore carries the current link forward
 * unless the caller is explicitly changing it.
 */
function mergeItemPatch(
  item: PaymentPlanItem,
  patch: {
    expectedDate?: string | null;
    installmentNumber?: number | null;
    itemStatus?: PaymentPlanItem['itemStatus'] | null;
    eventId?: number | null;
    draftId?: number | null;
  },
  links: { keepCurrent: boolean },
) {
  const currentEventId = links.keepCurrent ? item.eventId ?? undefined : undefined;
  const currentDraftId = links.keepCurrent ? item.draftId ?? undefined : undefined;

  return {
    installmentNumber: patch.installmentNumber ?? item.installmentNumber,
    expectedDate: patch.expectedDate ?? item.expectedDate,
    itemStatus: patch.itemStatus ?? item.itemStatus,
    eventId: patch.eventId ?? currentEventId,
    draftId: patch.draftId ?? currentDraftId,
  };
}

function putItem(client: ApiClient, planId: number, itemId: number, body: ReturnType<typeof mergeItemPatch>) {
  return unwrap(
    client.PUT('/payment-plans/{id}/items/{itemId}', {
      params: { path: { id: planId, itemId } },
      body,
    }),
  );
}

function describePlan(plan: PaymentPlan) {
  const items = plan.items ?? [];
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? undefined,
    planType: plan.planType,
    status: plan.status,
    frequency: plan.frequency ?? undefined,
    startDate: plan.startDate,
    endDate: plan.endDate ?? undefined,
    scheduleEndDate: plan.scheduleEndDate ?? undefined,
    nextDueDate: plan.nextDueDate ?? undefined,
    isAutomated: plan.isAutomated,
    template: plan.template?.name,
    installmentAmount: plan.installmentAmount ?? undefined,
    totalAmount: plan.totalAmount ?? undefined,
    totalInstallments: plan.totalInstallments ?? undefined,
    completedInstallments: plan.completedInstallments,
    paidAmount: plan.paidAmount,
    remainingAmount: plan.remainingAmount,
    category: plan.category?.name,
    tags: (plan.tags ?? []).map((tag) => tag.name),
    canAddItems: hasRoomForAnotherItem(plan),
    items: items.map((item) => ({
      itemId: item.id,
      installmentNumber: item.installmentNumber,
      expectedDate: item.expectedDate,
      itemStatus: item.itemStatus,
      eventId: item.eventId ?? undefined,
      draftId: item.draftId ?? undefined,
    })),
  };
}

export function buildPaymentPlanTools(ctx: RequestContext): KindedToolSet {
  const client = createApiClient(ctx);

  function createItem(planId: number, body: { installmentNumber: number; expectedDate: string; itemStatus?: PaymentPlanItem['itemStatus']; eventId?: number; draftId?: number }) {
    return unwrap(client.POST('/payment-plans/{id}/items', { params: { path: { id: planId } }, body }));
  }

  /**
   * The backend silently skips an eventId/draftId that does not exist, so the created plan is
   * read back and any id missing from its items is reported rather than leaving the group
   * looking complete.
   */
  function missingGroupMembers(plan: PaymentPlan, eventIds: number[], draftIds: number[]) {
    const linkedEventIds = new Set((plan.items ?? []).map((item) => item.eventId).filter((id): id is number => id != null));
    const linkedDraftIds = new Set((plan.items ?? []).map((item) => item.draftId).filter((id): id is number => id != null));
    return [...eventIds.filter((id) => !linkedEventIds.has(id)), ...draftIds.filter((id) => !linkedDraftIds.has(id))];
  }

  async function resolveTargetItem(plan: PaymentPlan, itemId: number | null | undefined) {
    if (itemId != null) {
      const requested = findItem(plan, itemId);
      if (!requested) throw new BackendError(404, `Payment plan item not found: ${itemId}`);
      return requested;
    }

    const freeItem = (plan.items ?? []).find((item) => item.eventId == null && item.draftId == null);
    if (freeItem) return freeItem;

    if (!hasRoomForAnotherItem(plan)) {
      throw new BackendError(
        400,
        `Plan ${plan.id} ("${plan.name}") is split into ${plan.totalInstallments} cuotas and already has them all, so no entry is free.`,
      );
    }

    return createItem(plan.id, { installmentNumber: nextInstallmentNumber(plan), expectedDate: plan.startDate });
  }

  return {
    // ===================== READ =====================
    listPaymentPlans: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking payment plans...', es: 'Consultando planes de pago...' } },
      tool: tool({
        description:
          'List every payment plan the user has, of all four kinds: installment purchases (cuotas), recurring agreements, ' +
          'one-off event groups and hand-built custom schedules. Use it to check installment progress (e.g. 3/12 cuotas), ' +
          'remaining balance, or to find the plan id any other payment-plan tool needs. Each plan reports canAddItems, ' +
          'which is false only when an installment plan already holds every cuota it declares.',
        inputSchema: z.object({}),
        execute: () =>
          safe(async () => {
            const plans = await unwrap(client.GET('/payment-plans'));
            return { plans: plans.map(describePlan) };
          }),
      }),
    },

    getPaymentPlan: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Reading payment plan...', es: 'Leyendo plan de pago...' } },
      tool: tool({
        description:
          'Read one payment plan with its full item list, including which event or draft each item is linked to. ' +
          'Call this before editing items so you know their itemId, number, date and current link.',
        inputSchema: z.object({ planId: NumericId }),
        execute: ({ planId }) => safe(async () => describePlan(await fetchPlan(client, planId))),
      }),
    },

    // ===================== WRITE: one tool per kind of plan =====================
    createEventGroup: {
      kind: 'WRITE',
      ui: { invalidates: PLAN_LINK_DOMAINS, label: { en: 'Creating event group...', es: 'Creando grupo de eventos...' } },
      tool: tool({
        description:
          'Bundle events that happened once into a named group: a trip, a party, a shared purchase. A group has no cadence, ' +
          'no cuota count and no total — it is just a bucket, and its total is the sum of the events inside it. Pass eventIds ' +
          'and/or draftIds to fill it in the same call; use addToPaymentPlan later to add more. This is the tool for ' +
          '"group these expenses", "how much did the Bariloche trip cost", "create a group for the party".',
        inputSchema: botEventGroupInputSchema,
        execute: (input) =>
          safe(async () => {
            const eventIds = input.eventIds ?? [];
            const draftIds = input.draftIds ?? [];
            const plan = await unwrap(
              client.POST('/payment-plans', {
                body: {
                  name: input.name,
                  description: input.description ?? undefined,
                  planType: 'GROUP',
                  startDate: input.date,
                  frequency: 'INSTANT',
                  isAutomated: false,
                  generateItems: false,
                  categoryId: input.categoryId ?? undefined,
                  tagIds: input.tagIds ?? undefined,
                  eventIds: eventIds.length > 0 ? eventIds : undefined,
                  draftIds: draftIds.length > 0 ? draftIds : undefined,
                },
              }),
            );

            const missing = missingGroupMembers(plan, eventIds, draftIds);

            return {
              ...describePlan(plan),
              linkedCount: (plan.items ?? []).length,
              ...(missing.length > 0 && {
                warning: `These ids do not exist and were not linked: ${missing.join(', ')}`,
              }),
            };
          }),
      }),
    },

    createInstallmentPlan: {
      kind: 'WRITE',
      ui: { invalidates: PLAN_MUTATION_DOMAINS, label: { en: 'Creating installment plan...', es: 'Creando plan en cuotas...' } },
      tool: tool({
        description:
          'Create a purchase split into cuotas — "the fridge in 12 cuotas of 5000". Cuotas are fixed: the count, the cadence ' +
          'and the end of the schedule are all known up front, and the backend pre-generates one item per cuota. As each ' +
          'cuota is paid, attach its event with addToPaymentPlan, backdating freely as long as the date sits inside the ' +
          'window the plan covers. Amount and templateId are only needed when isAutomated is true. Use this only when the ' +
          'number of cuotas is known and finite; for an open-ended agreement use createRecurringPlan.',
        inputSchema: botInstallmentPlanInputSchema,
        execute: (input) =>
          safe(async () => {
            const plan = await unwrap(
              client.POST('/payment-plans', {
                body: {
                  name: input.name,
                  description: input.description ?? undefined,
                  planType: 'INSTALLMENT',
                  startDate: input.startDate,
                  frequency: input.frequency,
                  totalInstallments: input.totalInstallments,
                  installmentAmount: input.installmentAmount ?? undefined,
                  totalAmount:
                    input.totalAmount ??
                    (input.installmentAmount != null ? input.installmentAmount * input.totalInstallments : undefined),
                  isAutomated: input.isAutomated ?? false,
                  templateId: input.templateId ?? undefined,
                  generateItems: true,
                  categoryId: input.categoryId ?? undefined,
                  tagIds: input.tagIds ?? undefined,
                },
              }),
            );
            return describePlan(plan);
          }),
      }),
    },

    createRecurringPlan: {
      kind: 'WRITE',
      ui: { invalidates: PLAN_MUTATION_DOMAINS, label: { en: 'Creating recurring plan...', es: 'Creando plan recurrente...' } },
      tool: tool({
        description:
          'Create a recurring commitment — a subscription like Netflix, or rent. Unlike cuotas it is dynamic: no cuota count ' +
          'and, unless endDate is given, no end, so no items exist up front and each cycle adds one. Past cycles can be ' +
          'recorded at any time with addToPaymentPlan, as long as the date sits inside the window. Amount and templateId ' +
          'are only needed when isAutomated is true. Use createInstallmentPlan instead when the number of payments is ' +
          'fixed and known.',
        inputSchema: botRecurringPlanInputSchema,
        execute: (input) =>
          safe(async () => {
            const plan = await unwrap(
              client.POST('/payment-plans', {
                body: {
                  name: input.name,
                  description: input.description ?? undefined,
                  planType: 'RECURRING',
                  startDate: input.startDate,
                  endDate: input.endDate ?? undefined,
                  frequency: input.frequency,
                  installmentAmount: input.installmentAmount ?? undefined,
                  isAutomated: input.isAutomated ?? false,
                  templateId: input.templateId ?? undefined,
                  generateItems: false,
                  categoryId: input.categoryId ?? undefined,
                  tagIds: input.tagIds ?? undefined,
                },
              }),
            );
            return describePlan(plan);
          }),
      }),
    },

    createCustomPlan: {
      kind: 'WRITE',
      ui: { invalidates: PLAN_MUTATION_DOMAINS, label: { en: 'Creating custom plan...', es: 'Creando plan personalizado...' } },
      tool: tool({
        description:
          'Create a hand-built plan over a window of time — "the debt with Ana between March and September", "savings for ' +
          'the trip". It has no cadence and is never automated: you state a start and an end, then add each entry yourself ' +
          'with addToPaymentPlan. Use createInstallmentPlan when the payments repeat on a fixed cadence, or ' +
          'createEventGroup when they all happened on one occasion.',
        inputSchema: botCustomPlanInputSchema,
        execute: (input) =>
          safe(async () => {
            const plan = await unwrap(
              client.POST('/payment-plans', {
                body: {
                  name: input.name,
                  description: input.description ?? undefined,
                  planType: 'CUSTOM',
                  startDate: input.startDate,
                  endDate: input.endDate,
                  isAutomated: false,
                  generateItems: false,
                  categoryId: input.categoryId ?? undefined,
                  tagIds: input.tagIds ?? undefined,
                },
              }),
            );
            return describePlan(plan);
          }),
      }),
    },

    updatePaymentPlan: {
      kind: 'WRITE',
      ui: { invalidates: PLAN_MUTATION_DOMAINS, label: { en: 'Updating payment plan...', es: 'Actualizando plan de pago...' } },
      tool: tool({
        description:
          'Edit any existing payment plan. Only the provided fields change; everything else is preserved. Use status to pause ' +
          'a plan, cancel it, or mark it COMPLETED once a group or a set of cuotas is closed. The kind of plan cannot be changed.',
        inputSchema: botPaymentPlanPatchSchema,
        execute: (patch) =>
          safe(async () => {
            const plan = await fetchPlan(client, patch.planId);
            const updated = await unwrap(
              client.PUT('/payment-plans/{id}', { params: { path: { id: patch.planId } }, body: mergePlanPatch(plan, patch) }),
            );
            return describePlan(updated);
          }),
      }),
    },

    // ===================== WRITE: items =====================
    addToPaymentPlan: {
      kind: 'WRITE',
      ui: { invalidates: PLAN_LINK_DOMAINS, label: { en: 'Adding to payment plan...', es: 'Agregando al plan de pago...' } },
      tool: tool({
        description:
          'Attach an existing event or draft to a plan of any kind, and mark that entry as paid. Pass eventId OR draftId, ' +
          'never both. In a group or a custom plan this adds a new entry; in a cuota or subscription plan it fills the first ' +
          'cuota that has no event yet, the one named by itemId, or a new cycle when none is free. This is the tool for ' +
          '"add this expense to the trip group" and for "this payment covers cuota 3".',
        inputSchema: z
          .object({
            planId: NumericId,
            eventId: NumericId.nullish(),
            draftId: NumericId.nullish(),
            itemId: NumericId.nullish().describe('The specific entry to fill. Defaults to the first one with no event.'),
          })
          .refine((input) => (input.eventId == null) !== (input.draftId == null), {
            error: 'Pass exactly one of eventId or draftId.',
          }),
        execute: ({ planId, eventId, draftId, itemId }) =>
          safe(async () => {
            const plan = await fetchPlan(client, planId);
            const target = await resolveTargetItem(plan, itemId);
            const updated = await putItem(
              client,
              planId,
              target.id,
              mergeItemPatch(
                target,
                {
                  itemStatus: eventId != null ? 'PAID' : 'DRAFTED',
                  eventId: eventId ?? undefined,
                  draftId: draftId ?? undefined,
                },
                { keepCurrent: false },
              ),
            );
            return {
              ok: true,
              planId,
              planName: plan.name,
              itemId: updated.id,
              installmentNumber: updated.installmentNumber,
              eventId: updated.eventId ?? undefined,
              draftId: updated.draftId ?? undefined,
            };
          }),
      }),
    },

    removeFromPaymentPlan: {
      kind: 'WRITE',
      ui: { invalidates: PLAN_LINK_DOMAINS, label: { en: 'Removing from payment plan...', es: 'Quitando del plan de pago...' } },
      tool: tool({
        description:
          'Take an event or draft out of a plan. The event itself is never deleted. What happens to the entry depends on the ' +
          'kind of plan, and is decided for you: in a group or a custom plan the entry disappears with it, since an entry ' +
          'without an event is meaningless; in a cuota or subscription plan the cuota stays and goes back to pending, ' +
          'because it is a slot in a schedule. Identify the entry by itemId, or by the eventId/draftId it holds.',
        inputSchema: z.object({
          planId: NumericId,
          itemId: NumericId.nullish(),
          eventId: NumericId.nullish(),
          draftId: NumericId.nullish(),
        }),
        execute: ({ planId, itemId, eventId, draftId }) =>
          safe(async () => {
            const plan = await fetchPlan(client, planId);
            const items = plan.items ?? [];
            const target =
              itemId != null
                ? items.find((item) => item.id === itemId)
                : items.find((item) =>
                    eventId != null ? item.eventId === eventId : draftId != null && item.draftId === draftId,
                  );

            if (!target) return { error: `No entry of plan ${planId} ("${plan.name}") matches the given itemId/eventId/draftId.` };

            if (hasLinkOnlyItems(plan)) {
              await unwrap(
                client.DELETE('/payment-plans/{id}/items/{itemId}', { params: { path: { id: planId, itemId: target.id } } }),
              );
              return { ok: true, planId, planName: plan.name, itemId: target.id, outcome: 'entry deleted' };
            }

            const updated = await putItem(
              client,
              planId,
              target.id,
              mergeItemPatch(target, { itemStatus: 'PENDING' }, { keepCurrent: false }),
            );
            return {
              ok: true,
              planId,
              planName: plan.name,
              itemId: updated.id,
              installmentNumber: updated.installmentNumber,
              outcome: 'cuota kept and reset to pending',
            };
          }),
      }),
    },

    updatePaymentPlanItem: {
      kind: 'WRITE',
      ui: { invalidates: PLAN_MUTATION_DOMAINS, label: { en: 'Updating plan entry...', es: 'Actualizando cuota del plan...' } },
      tool: tool({
        description:
          'Edit one entry of a plan: its expected date, its position in the plan, or its status. An entry carries no amount ' +
          'of its own — the money lives on the event it links to. Any linked event or draft is kept. The expected date must ' +
          'stay inside the window the plan covers.',
        inputSchema: botPaymentPlanItemPatchSchema,
        execute: ({ planId, itemId, ...patch }) =>
          safe(async () => {
            const plan = await fetchPlan(client, planId);
            const item = findItem(plan, itemId);
            if (!item) return { error: `Payment plan item not found: ${itemId}` };

            const updated = await putItem(client, planId, itemId, mergeItemPatch(item, patch, { keepCurrent: true }));
            return { ok: true, planId, itemId, installmentNumber: updated.installmentNumber, itemStatus: updated.itemStatus };
          }),
      }),
    },
  } satisfies KindedToolSet;
}
