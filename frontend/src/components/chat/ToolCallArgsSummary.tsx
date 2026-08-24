import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface ToolCallArgsSummaryProps {
  args: unknown;
}

interface SummaryRow {
  label: string;
  value: string;
}

interface LineItem {
  nodeId?: number | null;
  amount?: number;
}

/** Identifiers the card already conveys through the entity it renders, or that mean nothing to a reader. */
const OPAQUE_ARG_KEYS = new Set(['eventId', 'draftId', 'targetEventId', 'originalEventId', 'id', 'planId', 'taskId']);

function labelOf(argKey: string, t: TFunction): string {
  switch (argKey) {
    case 'name': return t('chat.approval.args.name');
    case 'description': return t('chat.approval.args.description');
    case 'type': return t('chat.approval.args.type');
    case 'date': return t('chat.approval.args.date');
    case 'categoryId': return t('chat.approval.args.category');
    case 'tagIds': return t('chat.approval.args.tags');
    case 'lineItems': return t('chat.approval.args.lineItems');
    case 'fileIds': return t('chat.approval.args.files');
    default: return argKey;
  }
}

function asRecord(args: unknown): Record<string, unknown> {
  return typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {};
}

function isEmptyValue(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

/**
 * Renders the arguments of a tool call awaiting approval as readable field/value rows, so the user
 * sees what is about to change instead of only which action was requested. Ids are resolved to the
 * names they stand for, since an id tells the reader nothing.
 */
export function ToolCallArgsSummary({ args }: ToolCallArgsSummaryProps) {
  const { t } = useTranslation();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data: nodes } = useNodes();

  const nameOfNode = (nodeId: number | null | undefined): string =>
    nodes?.find((node) => node.id === nodeId)?.name ?? t('chat.approval.args.unknownNode');

  const describeLineItems = (lineItems: LineItem[]): string =>
    lineItems.map((item) => `${nameOfNode(item.nodeId)} ${formatCurrency(item.amount ?? 0)}`).join(' · ');

  const describe = (argKey: string, value: unknown): string | null => {
    if (argKey === 'categoryId') return categories?.find((category) => category.id === value)?.name ?? String(value);
    if (argKey === 'tagIds' && Array.isArray(value)) {
      return value.map((tagId) => tags?.find((tag) => tag.id === tagId)?.name ?? String(tagId)).join(', ');
    }
    if (argKey === 'lineItems' && Array.isArray(value)) return describeLineItems(value as LineItem[]);
    if (argKey === 'fileIds' && Array.isArray(value)) return t('chat.approval.args.fileCount', { count: value.length });
    if (argKey === 'date' && typeof value === 'string') return formatDateTime(value) || value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return null;
  };

  const rows: SummaryRow[] = Object.entries(asRecord(args))
    .filter(([argKey, value]) => !OPAQUE_ARG_KEYS.has(argKey) && !isEmptyValue(value))
    .map(([argKey, value]) => ({ label: labelOf(argKey, t), value: describe(argKey, value) ?? '' }))
    .filter((row) => row.value !== '');

  if (rows.length === 0) return null;

  return (
    <dl className="flex flex-col gap-1 rounded-lg bg-dn-bg/40 px-3 py-2 text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-2">
          <dt className="shrink-0 text-dn-text-muted">{row.label}</dt>
          <dd className="min-w-0 flex-1 break-words text-dn-text-main">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
