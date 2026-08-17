import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { normalizeText } from '@/lib/utils/textUtils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EventSelectionList } from '@/components/events/EventSelectionList';
import type { FinanceEvent } from '@/models';

interface DraftMultiSelectModalProps {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
  title: string;
  onConfirm: (selectedDraftIds: Set<number>) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  minSelection?: number;
  maxSelection?: number;
  initialSelectedIds?: ReadonlySet<number>;
  excludeDraftIds?: ReadonlySet<number>;
}

export function DraftMultiSelectModal({
  open,
  onClose,
  onCancel,
  title,
  onConfirm,
  confirmLabel,
  cancelLabel,
  minSelection = 1,
  maxSelection,
  initialSelectedIds = new Set(),
  excludeDraftIds = new Set(),
}: DraftMultiSelectModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(initialSelectedIds));

  const { data: draftsData, isLoading, error } = useFinanceEventDrafts();
  const drafts = useMemo(() => draftsData ?? [], [draftsData]);

  const draftOptions = useMemo(() => {
    const withDraftId = drafts.filter((draft) => draft.draftId != null && !excludeDraftIds.has(draft.draftId));
    if (!search.trim()) return withDraftId;
    const normalizedSearch = normalizeText(search);
    return withDraftId.filter((draft) => normalizeText(draft.name).includes(normalizedSearch));
  }, [drafts, search, excludeDraftIds]);

  const resetState = () => {
    setSearch('');
    setSelectedIds(new Set(initialSelectedIds));
  };

  const handleToggle = (draft: FinanceEvent) => {
    if (draft.draftId == null) return;
    const draftId = draft.draftId;
    setSelectedIds((prev) => {
      if (maxSelection === 1) {
        if (prev.has(draftId)) return new Set<number>();
        return new Set<number>([draftId]);
      }

      const next = new Set(prev);
      if (next.has(draftId)) next.delete(draftId);
      else if (!maxSelection || next.size < maxSelection) next.add(draftId);
      return next;
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleCancel = () => {
    resetState();
    if (onCancel) {
      onCancel();
      return;
    }
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(new Set(selectedIds));
    setSearch('');
    setSelectedIds(new Set());
  };

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="space-y-4">
        <EventSelectionList
          events={draftOptions}
          isLoading={isLoading}
          error={error}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('events.searchPlaceholder')}
          emptyStateTitle={search ? t('events.noEventsFoundSearch') : t('events.noEventsFound')}
          onSelectEvent={handleToggle}
          selectionIndicator={maxSelection === 1 ? 'radio' : 'checkbox'}
          selectedIds={selectedIds}
          selectionIdResolver={(draft) => draft.draftId ?? draft.id}
          maxHeightClass="max-h-[40vh]"
        />

        {selectedIds.size > 0 && (
          <p className="text-xs text-dn-primary font-medium px-1">
            {t('events.selectedCount', { count: selectedIds.size })}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size < minSelection || (maxSelection !== undefined && selectedIds.size > maxSelection)}
          >
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
