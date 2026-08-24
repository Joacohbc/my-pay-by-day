import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { InlineDraftApprovalSummary } from '@/components/chat/InlineDraftApprovalSummary';
import { ToolCallArgsSummary } from '@/components/chat/ToolCallArgsSummary';

export interface PendingApproval {
  approvalId: string;
  toolLabel: string;
  args: unknown;
  draftId?: number;
  eventId?: number;
}

interface InlineToolApprovalGroupCardProps {
  approvals: PendingApproval[];
  onRespond: (approvalId: string, approved: boolean) => void;
}

/**
 * The several tool calls one assistant turn asked approval for, shown as one decision with each
 * action still spelled out. Answering them one card at a time made a batch tedious without making
 * it any clearer, since nothing runs until the last one is answered anyway.
 */
export function InlineToolApprovalGroupCard({ approvals, onRespond }: InlineToolApprovalGroupCardProps) {
  const { t } = useTranslation();
  const [respondedIds, setRespondedIds] = useState<string[]>([]);

  const respond = (approvalId: string, approved: boolean) => {
    setRespondedIds((previous) => [...previous, approvalId]);
    onRespond(approvalId, approved);
  };

  const respondToAll = (approved: boolean) => {
    const pending = approvals.filter((approval) => !respondedIds.includes(approval.approvalId));
    setRespondedIds(approvals.map((approval) => approval.approvalId));
    pending.forEach((approval) => onRespond(approval.approvalId, approved));
  };

  return (
    <Card className="mt-2 flex flex-col gap-3 border border-dn-warning/30 bg-dn-warning/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-dn-warning">
          <Icon name="priority_high" className="text-[14px]" />
          {t('chat.approval.pendingCount', { count: approvals.length })}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => respondToAll(true)} disabled={respondedIds.length > 0}>
            {t('chat.approval.approveAll')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => respondToAll(false)} disabled={respondedIds.length > 0}>
            {t('chat.approval.rejectAll')}
          </Button>
        </div>
      </div>

      {approvals.map((approval) => {
        const isResponded = respondedIds.includes(approval.approvalId);
        return (
          <div key={approval.approvalId} className="flex flex-col gap-2 border-t border-dn-border/20 pt-3">
            <p className="text-sm text-dn-text-main">{approval.toolLabel}</p>
            <ToolCallArgsSummary args={approval.args} />
            {(approval.draftId != null || approval.eventId != null) && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-dn-text-muted/70">
                  {t('chat.approval.currentState')}
                </span>
                <InlineDraftApprovalSummary draftId={approval.draftId} eventId={approval.eventId} />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => respond(approval.approvalId, true)} disabled={isResponded}>
                {t('chat.approval.approve')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => respond(approval.approvalId, false)} disabled={isResponded}>
                {t('chat.approval.reject')}
              </Button>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
