import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { InlineDraftApprovalSummary } from '@/components/chat/InlineDraftApprovalSummary';

interface InlineToolApprovalCardProps {
  toolLabel: string;
  approvalId: string;
  draftId?: number;
  eventId?: number;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

export function InlineToolApprovalCard({ toolLabel, approvalId, draftId, eventId, onApprove, onReject }: InlineToolApprovalCardProps) {
  const { t } = useTranslation();
  const [isResponding, setIsResponding] = useState(false);

  const respond = (approved: boolean) => {
    setIsResponding(true);
    (approved ? onApprove : onReject)(approvalId);
  };

  return (
    <Card className="flex flex-col gap-2 mt-2 border border-dn-warning/30 bg-dn-warning/5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-dn-warning">
        <Icon name="priority_high" className="text-[14px]" />
        {t('chat.approval.title')}
      </div>
      <p className="text-sm text-dn-text-main">{toolLabel}</p>
      {(draftId != null || eventId != null) && (
        <div className="rounded-lg bg-dn-bg/40 px-3 py-2">
          <InlineDraftApprovalSummary draftId={draftId} eventId={eventId} />
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
