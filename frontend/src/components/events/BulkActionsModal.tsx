import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { HoldToConfirmButton } from '@/components/ui/HoldToConfirmButton';

interface BulkActionsModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmAll: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
  isConfirming: boolean;
  isDeleting: boolean;
  draftCount: number;
}

export function BulkActionsModal({
  open,
  onClose,
  onConfirmAll,
  onDeleteAll,
  isConfirming,
  isDeleting,
  draftCount
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
          <HoldToConfirmButton
            icon="checklist_rtl"
            label={isConfirming ? t('common.loading') : t('drafts.confirmAll')}
            description={t('drafts.confirmAllDesc')}
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
