import { formatMoney, getCurrency, formatDate } from '@/lib/format';

/** Resolves the ids an argument carries into the names the user recognises. Supplied by the caller
 * so this module stays free of data access and can be exercised without a query client. */
export interface ApprovalArgLookups {
  translate: (translationKey: string, values?: Record<string, unknown>) => string;
  enumLabel: (namespace: string, value: unknown) => string;
  categoryName: (categoryId: unknown) => string;
  tagName: (tagId: unknown) => string;
  nodeName: (nodeId: unknown) => string;
  planName: (planId: unknown) => string;
  planItemLabel: (itemId: unknown) => string;
  templateName: (templateId: unknown) => string;
}

/** A single line, or one line per element when the value holds several (e.g. line items). */
export type ApprovalArgText = string | string[];

type ApprovalArgFormatter = (value: unknown, lookups: ApprovalArgLookups) => ApprovalArgText;

interface LineItemArg {
  nodeId?: number | null;
  amount?: number | null;
  currency?: string | null;
}

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

const asText: ApprovalArgFormatter = (value) => String(value);
const asDate: ApprovalArgFormatter = (value) => (typeof value === 'string' ? formatDate(value) : String(value));
/**
 * A proposed amount arrives on its own, with no stored record to read a currency from, so it is
 * shown in the currency the user enters amounts in. Once approved it is the line items — which do
 * carry their currency — that decide how it is stored.
 */
const asAmount: ApprovalArgFormatter = (value) =>
  typeof value === 'number' ? formatMoney(value, getCurrency()) : String(value);
const asYesNo: ApprovalArgFormatter = (value, lookups) => lookups.translate(value ? 'common.yes' : 'common.no');

const asEnum =
  (namespace: string): ApprovalArgFormatter =>
  (value, lookups) =>
    lookups.enumLabel(namespace, value);

const asCount =
  (countTranslationKey: string): ApprovalArgFormatter =>
  (value, lookups) =>
    lookups.translate(countTranslationKey, { count: toArray(value).length });

const asTagNames: ApprovalArgFormatter = (value, lookups) =>
  toArray(value)
    .map((tagId) => lookups.tagName(tagId))
    .join(', ');

const asLineItems: ApprovalArgFormatter = (value, lookups) =>
  toArray(value).map((item) => {
    const lineItem = item as LineItemArg;
    const currency = lineItem.currency ?? getCurrency();
    return `${lookups.nodeName(lineItem.nodeId)} · ${formatMoney(Number(lineItem.amount ?? 0), currency)}`;
  });

/**
 * How every argument an approval-gated tool can carry is shown to the user. Adding support for a new
 * tool means adding its argument names here plus their `chat.approval.fields.*` labels — nothing
 * else in the approval UI needs to change. A name missing from this table still renders, under its
 * raw key and value.
 */
const APPROVAL_ARG_FORMATTERS: Record<string, ApprovalArgFormatter> = {
  name: asText,
  description: asText,
  type: asEnum('eventType'),
  status: asEnum('paymentPlans.status'),
  itemStatus: asEnum('paymentPlans.itemStatus'),
  frequency: asEnum('subscriptions.recurrence'),
  mode: asEnum('chat.approval.modes'),
  date: asDate,
  startDate: asDate,
  endDate: asDate,
  expectedDate: asDate,
  totalAmount: asAmount,
  installmentAmount: asAmount,
  amount: asAmount,
  isAutomated: asYesNo,
  totalInstallments: asText,
  installmentNumber: asText,
  categoryId: (value, lookups) => lookups.categoryName(value),
  tagIds: asTagNames,
  lineItems: asLineItems,
  currency: asText,
  planId: (value, lookups) => lookups.planName(value),
  itemId: (value, lookups) => lookups.planItemLabel(value),
  templateId: (value, lookups) => lookups.templateName(value),
  fileIds: asCount('chat.approval.fileCount'),
  eventIds: asCount('chat.approval.eventCount'),
  draftIds: asCount('chat.approval.draftCount'),
};

function formatUnknownArg(value: unknown): ApprovalArgText {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return Array.isArray(value) && value.length === 0;
}

/** The argument entries worth showing: every key that carries a value, minus those already rendered
 * elsewhere in the approval card (an entity id shown as a card, for instance). */
export function selectApprovalArgs(args: unknown, omittedKeys: readonly string[] = []): [string, unknown][] {
  if (args == null || typeof args !== 'object' || Array.isArray(args)) return [];
  return Object.entries(args as Record<string, unknown>).filter(
    ([key, value]) => !omittedKeys.includes(key) && !isEmptyValue(value),
  );
}

export function hasApprovalArgs(args: unknown, omittedKeys: readonly string[] = []): boolean {
  return selectApprovalArgs(args, omittedKeys).length > 0;
}

export function isKnownApprovalArg(key: string): boolean {
  return key in APPROVAL_ARG_FORMATTERS;
}

export function formatApprovalArg(key: string, value: unknown, lookups: ApprovalArgLookups): ApprovalArgText {
  const format = APPROVAL_ARG_FORMATTERS[key];
  return format ? format(value, lookups) : formatUnknownArg(value);
}

/** Sorts entries by the order a tool declares, leaving the ones it doesn't name at the end. */
export function orderApprovalArgs(
  entries: [string, unknown][],
  leadingKeys: readonly string[] = [],
): [string, unknown][] {
  const rankOf = (key: string) => {
    const position = leadingKeys.indexOf(key);
    return position === -1 ? leadingKeys.length : position;
  };
  return [...entries].sort(([left], [right]) => rankOf(left) - rankOf(right));
}

/** The resolved text of every argument, keyed by argument name, for interpolating a tool's sentence. */
export function toApprovalSummaryValues(
  entries: [string, unknown][],
  lookups: ApprovalArgLookups,
): Record<string, string> {
  return Object.fromEntries(
    entries.map(([key, value]) => {
      const text = formatApprovalArg(key, value, lookups);
      return [key, Array.isArray(text) ? text.join(', ') : text];
    }),
  );
}
