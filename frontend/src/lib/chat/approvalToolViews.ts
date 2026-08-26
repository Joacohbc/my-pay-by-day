/**
 * How one approval-gated tool presents itself in the chat's approval card.
 *
 * Adding a tool means adding one entry here plus its `chat.approval.tools.*` sentence in both
 * languages. A tool with no entry still renders: it falls back to the progress label from the tool
 * manifest and shows every argument as a detail row.
 */
export interface ApprovalToolView {
  /**
   * Translation key of the sentence describing what the tool will do. Its interpolation
   * placeholders are argument names filled with the same resolved text the detail rows show —
   * `{{planId}}` renders the plan's name, `{{itemId}}` the cuota it points at.
   */
  summaryKey: string;
  /** Arguments whose ids are rendered as entity cards instead of detail rows. */
  entityArgs?: readonly ApprovalEntityArg[];
  /** Leading order for the detail rows. Arguments not listed keep following them. */
  detailArgs?: readonly string[];
}

/** An argument holding one id or a list of them, and which entity those ids name. */
export interface ApprovalEntityArg {
  name: string;
  entity: 'event' | 'draft';
}

export interface ApprovalEntityCard {
  entity: 'event' | 'draft';
  id: number;
}

const EVENT_OR_DRAFT: readonly ApprovalEntityArg[] = [
  { name: 'draftId', entity: 'draft' },
  { name: 'eventId', entity: 'event' },
];

const EVENT_OR_DRAFT_MEMBERS: readonly ApprovalEntityArg[] = [
  { name: 'draftIds', entity: 'draft' },
  { name: 'eventIds', entity: 'event' },
];

const APPROVAL_TOOL_VIEWS: Record<string, ApprovalToolView> = {
  updateEvent: {
    summaryKey: 'chat.approval.tools.updateEvent',
    entityArgs: [{ name: 'eventId', entity: 'event' }],
    detailArgs: ['name', 'type', 'date', 'lineItems', 'categoryId', 'tagIds', 'description', 'fileIds'],
  },
  createEventGroup: {
    summaryKey: 'chat.approval.tools.createEventGroup',
    detailArgs: ['date', 'eventIds', 'draftIds', 'categoryId', 'tagIds', 'description'],
  },
  createInstallmentPlan: {
    summaryKey: 'chat.approval.tools.createInstallmentPlan',
    detailArgs: ['totalInstallments', 'installmentAmount', 'totalAmount', 'frequency', 'startDate'],
  },
  createRecurringPlan: {
    summaryKey: 'chat.approval.tools.createRecurringPlan',
    detailArgs: ['installmentAmount', 'frequency', 'startDate', 'endDate'],
  },
  createCustomPlan: {
    summaryKey: 'chat.approval.tools.createCustomPlan',
    detailArgs: ['startDate', 'endDate', 'categoryId', 'tagIds', 'description'],
  },
  updatePaymentPlan: {
    summaryKey: 'chat.approval.tools.updatePaymentPlan',
    detailArgs: ['status', 'name', 'frequency', 'startDate', 'endDate', 'totalInstallments', 'installmentAmount', 'totalAmount'],
  },
  addToPaymentPlan: {
    summaryKey: 'chat.approval.tools.addToPaymentPlan',
    entityArgs: EVENT_OR_DRAFT_MEMBERS,
    detailArgs: ['itemId'],
  },
  removeFromPaymentPlan: {
    summaryKey: 'chat.approval.tools.removeFromPaymentPlan',
    entityArgs: EVENT_OR_DRAFT,
    detailArgs: ['itemId'],
  },
  updatePaymentPlanItem: {
    summaryKey: 'chat.approval.tools.updatePaymentPlanItem',
    detailArgs: ['itemStatus', 'expectedDate', 'installmentNumber'],
  },
};

export function approvalToolViewOf(toolName: string): ApprovalToolView | undefined {
  return APPROVAL_TOOL_VIEWS[toolName];
}

/** Every entity the call carries, in the order the tool declares — one card each. */
export function entityCardsOf(view: ApprovalToolView | undefined, args: unknown): ApprovalEntityCard[] {
  if (!view?.entityArgs || args == null || typeof args !== 'object') return [];
  const presentArgs = args as Record<string, unknown>;
  return view.entityArgs.flatMap(({ name, entity }) => idsOf(presentArgs[name]).map((id) => ({ entity, id })));
}

/** The argument names the cards already cover, so the detail rows do not repeat them. */
export function entityArgNamesOf(view: ApprovalToolView | undefined): string[] {
  return (view?.entityArgs ?? []).map((entityArg) => entityArg.name);
}

function idsOf(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.filter((item): item is number => typeof item === 'number');
  return [];
}
