import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

interface BulkApprovalBarProps {
  pendingCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
}

export function BulkApprovalBar({ pendingCount, onApproveAll, onRejectAll }: BulkApprovalBarProps) {
  const { t } = useTranslation();
  const [isResponding, setIsResponding] = useState(false);

  const respond = (respondAll: () => void) => {
    setIsResponding(true);
    respondAll();
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 md:px-8 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-dn-warning/30 bg-dn-warning/10 backdrop-blur px-4 py-3 shadow-lg">
        <div className="flex items-center gap-1.5 text-xs font-medium text-dn-warning">
          <Icon name="priority_high" className="text-[14px]" />
          {t('chat.approval.pendingCount', { count: pendingCount })}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => respond(onApproveAll)} disabled={isResponding}>
            {t('chat.approval.approveAll', { count: pendingCount })}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => respond(onRejectAll)} disabled={isResponding}>
            {t('chat.approval.rejectAll', { count: pendingCount })}
          </Button>
        </div>
      </div>
    </div>
  );
}
