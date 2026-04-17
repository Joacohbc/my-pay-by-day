import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { HoldToConfirmButton } from '@/components/ui/HoldToConfirmButton';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface BulkActionsModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmAll: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
  isConfirming: boolean;
  isDeleting: boolean;
  draftCount: number;
  confirmLabel?: string;
  confirmDescription?: string;
  onChooseDrafts?: () => void;
}

export function BulkActionsModal({
  open,
  onClose,
  onConfirmAll,
  onDeleteAll,
  isConfirming,
  isDeleting,
  draftCount,
  confirmLabel,
  confirmDescription,
  onChooseDrafts,
}: BulkActionsModalProps) {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    await onConfirmAll();
    onClose();
  };

  const handleDelete = async () => {
    await onDeleteAll();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('drafts.bulkActions')}
    >
      <div className="space-y-4 py-2">
        <p className="text-xs text-dn-text-muted px-1 uppercase tracking-wider font-semibold">
          {t('events.eventsCount', { count: draftCount })}
        </p>
        
        <div className="space-y-3">
          {onChooseDrafts && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={onChooseDrafts}
              disabled={isConfirming || isDeleting}
            >
              <Icon name="list_alt_check" className="text-base" />
              {t('drafts.chooseDrafts')}
            </Button>
          )}

          <HoldToConfirmButton
            icon="checklist_rtl"
            label={isConfirming ? t('common.loading') : (confirmLabel || t('drafts.confirmAll'))}
            description={confirmDescription || t('drafts.confirmAllDesc')}
            onConfirm={handleConfirm}
            disabled={isConfirming || isDeleting}
            variant="primary"
          />

          <HoldToConfirmButton
            icon="delete_sweep"
            label={t('drafts.deleteAll')}
            description={t('drafts.deleteAllDesc')}
            onConfirm={handleDelete}
            disabled={isConfirming || isDeleting}
            variant="danger"
          />
        </div>
      </div>
    </Modal>
  );
}
