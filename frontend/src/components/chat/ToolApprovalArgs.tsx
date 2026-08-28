import { useTranslation } from 'react-i18next';
import {
  formatApprovalArg,
  isKnownApprovalArg,
  orderApprovalArgs,
  type ApprovalArgLookups,
  type ApprovalArgText,
} from '@/lib/chat/approvalArgs';

interface ToolApprovalArgsProps {
  entries: [string, unknown][];
  lookups: ApprovalArgLookups;
  /** Argument names the tool wants listed first. */
  leadingKeys?: readonly string[];
}

function ApprovalArgValue({ text }: { text: ApprovalArgText }) {
  if (!Array.isArray(text)) return <>{text}</>;
  return (
    <span className="flex flex-col items-end gap-0.5">
      {text.map((line, index) => (
        <span key={index}>{line}</span>
      ))}
    </span>
  );
}

export function ToolApprovalArgs({ entries, lookups, leadingKeys }: ToolApprovalArgsProps) {
  const { t } = useTranslation();

  const labelOf = (key: string) => (isKnownApprovalArg(key) ? t(`chat.approval.fields.${key}`) : key);

  return (
    <dl className="flex flex-col gap-1 text-xs">
      {orderApprovalArgs(entries, leadingKeys).map(([key, value]) => (
        <div key={key} className="flex items-start justify-between gap-3">
          <dt className="text-dn-text-muted shrink-0">{labelOf(key)}</dt>
          <dd className="text-dn-text-main text-right break-words min-w-0">
            <ApprovalArgValue text={formatApprovalArg(key, value, lookups)} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
