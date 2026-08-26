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
  /** Arguments holding an event or draft to render as a card instead of a row. First match wins. */
  entityArgs?: readonly string[];
  /** Leading order for the detail rows. Arguments not listed keep following them. */
  detailArgs?: readonly string[];
}

const EVENT_OR_DRAFT = ['draftId', 'eventId'] as const;

const APPROVAL_TOOL_VIEWS: Record<string, ApprovalToolView> = {
  updateEvent: {
    summaryKey: 'chat.approval.tools.updateEvent',
    entityArgs: ['eventId'],
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
    entityArgs: EVENT_OR_DRAFT,
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

export function entityArgOf(view: ApprovalToolView | undefined, args: unknown): string | undefined {
  if (!view?.entityArgs || args == null || typeof args !== 'object') return undefined;
  const presentArgs = args as Record<string, unknown>;
  return view.entityArgs.find((argName) => typeof presentArgs[argName] === 'number');
}
