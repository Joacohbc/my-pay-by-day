import { useTranslation } from 'react-i18next';
import type { FinanceEvent } from '@/models';
import { Modal } from '@/components/ui/Modal';
import { EventSelectionList } from '@/components/events/EventSelectionList';
import { Button } from '@/components/ui/Button';

interface DraftSelectionModalProps {
  open: boolean;
  onClose: () => void;
  drafts: FinanceEvent[];
  isLoading: boolean;
  error: unknown;
  search: string;
  onSearchChange: (value: string) => void;
  selectedIds: ReadonlySet<number>;
  onSelectDraft: (draft: FinanceEvent) => void;
  selectedCount: number;
  onConfirmSelected: () => Promise<void>;
  onDeleteSelected: () => Promise<void>;
  isConfirming: boolean;
  isDeleting: boolean;
}

export function DraftSelectionModal({
  open,
  onClose,
  drafts,
  isLoading,
  error,
  search,
  onSearchChange,
  selectedIds,
  onSelectDraft,
  selectedCount,
  onConfirmSelected,
  onDeleteSelected,
  isConfirming,
  isDeleting,
}: DraftSelectionModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('drafts.chooseDrafts')}
      footer={
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-dn-text-muted">
            {t('events.selectedCount', { count: selectedCount })}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={onDeleteSelected}
              disabled={selectedCount === 0 || isConfirming || isDeleting}
              loading={isDeleting}
            >
              {t('drafts.deleteSelected')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onConfirmSelected}
              disabled={selectedCount === 0 || isConfirming || isDeleting}
              loading={isConfirming}
            >
              {t('drafts.confirmSelected')}
            </Button>
          </div>
        </div>
      }
    >
      <EventSelectionList
        events={drafts}
        isLoading={isLoading}
        error={error}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={t('events.searchPlaceholder')}
        emptyStateTitle={t('events.noEventsFound')}
        onSelectEvent={onSelectDraft}
        selectedIds={selectedIds}
        selectionIndicator="checkbox"
        maxHeightClass="max-h-[52vh]"
        selectionIdResolver={(draft) => draft.draftId ?? draft.id}
      />
    </Modal>
  );
}
