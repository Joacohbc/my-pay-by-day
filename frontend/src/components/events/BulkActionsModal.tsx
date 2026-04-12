import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
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
          <button
            className="w-full flex items-center gap-4 p-4 text-left bg-dn-bg/50 border border-white/5 rounded-card hover:bg-dn-bg transition-all disabled:opacity-50 disabled:pointer-events-none group"
            onClick={handleConfirm}
            disabled={isConfirming || isDeleting}
          >
            <div className="w-12 h-12 rounded-full bg-dn-surface flex items-center justify-center text-dn-primary shrink-0 group-hover:scale-110 transition-transform shadow-sm">
              <Icon name="checklist_rtl" className="text-2xl" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-dn-text-main text-base">
                {isConfirming ? t('common.loading') : t('drafts.confirmAll')}
              </p>
              <p className="text-xs text-dn-text-muted mt-0.5 leading-relaxed">
                {t('drafts.confirmAllDesc')}
              </p>
            </div>
            <Icon name="arrow_forward_ios" className="text-dn-text-muted text-[16px] group-hover:translate-x-1 transition-transform" />
          </button>

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
