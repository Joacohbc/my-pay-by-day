import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { InlineDraftApprovalSummary } from '@/components/chat/InlineDraftApprovalSummary';
import { ToolCallArgsSummary } from '@/components/chat/ToolCallArgsSummary';

/** Tailwind scans for whole class names, so each outcome carries its classes spelled out. */
const APPROVAL_PENDING = {
  card: 'border-dn-warning/30 bg-dn-warning/5',
  text: 'text-dn-warning',
  icon: 'priority_high',
  titleKey: 'chat.approval.title',
} as const;

const APPROVAL_APPROVED = {
  card: 'border-green-500/30 bg-green-500/5',
  text: 'text-green-500',
  icon: 'check_circle',
  titleKey: 'chat.approval.approved',
} as const;

const APPROVAL_REJECTED = {
  card: 'border-dn-error/30 bg-dn-error/5',
  text: 'text-dn-error',
  icon: 'cancel',
  titleKey: 'chat.approval.rejected',
} as const;

interface InlineToolApprovalCardProps {
  toolLabel: string;
  approvalId: string;
  /** The tool call's arguments, rendered so the user can see what they are approving. */
  args?: unknown;
  /** Set once the user answered: the card keeps the decision visible instead of asking again. */
  decision?: boolean;
  draftId?: number;
  eventId?: number;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

export function InlineToolApprovalCard({ toolLabel, approvalId, args, decision, draftId, eventId, onApprove, onReject }: InlineToolApprovalCardProps) {
  const { t } = useTranslation();
  const [isResponding, setIsResponding] = useState(false);

  const respond = (approved: boolean) => {
    setIsResponding(true);
    (approved ? onApprove : onReject)(approvalId);
  };

  const isSettled = decision !== undefined;
  const outcome = !isSettled ? APPROVAL_PENDING : decision ? APPROVAL_APPROVED : APPROVAL_REJECTED;

  return (
    <Card className={`flex flex-col gap-2 mt-2 border ${outcome.card}`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${outcome.text}`}>
        <Icon name={outcome.icon} className="text-[14px]" />
        {t(outcome.titleKey)}
      </div>
      <p className="text-sm text-dn-text-main">{toolLabel}</p>
      <ToolCallArgsSummary args={args} />
      {(draftId != null || eventId != null) && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.15em] text-dn-text-muted/70 font-black">
            {t('chat.approval.currentState')}
          </span>
          <InlineDraftApprovalSummary draftId={draftId} eventId={eventId} />
        </div>
      )}
      {!isSettled && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => respond(true)} disabled={isResponding}>
            {t('chat.approval.approve')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => respond(false)} disabled={isResponding}>
            {t('chat.approval.reject')}
          </Button>
        </div>
      )}
    </Card>
  );
}
