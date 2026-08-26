import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { InlineDraftApprovalSummary } from '@/components/chat/InlineDraftApprovalSummary';
import { ToolApprovalArgs } from '@/components/chat/ToolApprovalArgs';
import { useApprovalArgLookups } from '@/hooks/useApprovalArgLookups';
import { selectApprovalArgs, toApprovalSummaryValues } from '@/lib/chat/approvalArgs';
import { approvalToolViewOf, entityArgOf } from '@/lib/chat/approvalToolViews';

interface InlineToolApprovalCardProps {
  toolName: string;
  /** Shown when the tool declares no approval view of its own — the manifest's progress label. */
  fallbackLabel: string;
  args?: unknown;
  approvalId: string;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

function targetPlanIdOf(args: unknown): number {
  if (args == null || typeof args !== 'object') return 0;
  const planId = (args as Record<string, unknown>).planId;
  return typeof planId === 'number' ? planId : 0;
}

function entityIdOf(args: unknown, entityArg: string | undefined): number | undefined {
  if (!entityArg || args == null || typeof args !== 'object') return undefined;
  const entityId = (args as Record<string, unknown>)[entityArg];
  return typeof entityId === 'number' ? entityId : undefined;
}

export function InlineToolApprovalCard({
  toolName,
  fallbackLabel,
  args,
  approvalId,
  onApprove,
  onReject,
}: InlineToolApprovalCardProps) {
  const { t } = useTranslation();
  const lookups = useApprovalArgLookups(targetPlanIdOf(args));
  const [isResponding, setIsResponding] = useState(false);

  const respond = (approved: boolean) => {
    setIsResponding(true);
    (approved ? onApprove : onReject)(approvalId);
  };

  const view = approvalToolViewOf(toolName);
  const entityArg = entityArgOf(view, args);
  const entityId = entityIdOf(args, entityArg);
  const detailEntries = selectApprovalArgs(args, entityArg ? [entityArg] : []);
  const summary = view
    ? t(view.summaryKey, toApprovalSummaryValues(selectApprovalArgs(args), lookups))
    : fallbackLabel;

  return (
    <Card className="flex flex-col gap-3 mt-2 border border-dn-warning/30 bg-dn-warning/5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-dn-warning">
        <Icon name="priority_high" className="text-[14px]" />
        {t('chat.approval.title')}
      </div>

      <p className="text-sm text-dn-text-main">{summary}</p>

      {entityId != null && (
        <div className="rounded-lg bg-dn-bg/40 px-3 py-2">
          <InlineDraftApprovalSummary
            draftId={entityArg === 'draftId' ? entityId : undefined}
            eventId={entityArg === 'eventId' ? entityId : undefined}
          />
        </div>
      )}

      {detailEntries.length > 0 && (
        <div className="rounded-lg bg-dn-bg/40 px-3 py-2">
          <ToolApprovalArgs entries={detailEntries} leadingKeys={view?.detailArgs} lookups={lookups} />
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={() => respond(true)} disabled={isResponding}>
          {t('chat.approval.approve')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => respond(false)} disabled={isResponding}>
          {t('chat.approval.reject')}
        </Button>
      </div>
    </Card>
  );
}
