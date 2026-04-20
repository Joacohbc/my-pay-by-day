import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EventSelectionList } from '@/components/events/EventSelectionList';
import type { EventFilters } from '@/services/events.service';

interface EventMultiSelectModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onConfirm: (selectedIds: Set<number>) => void;
  confirmLabel?: string;
  minSelection?: number;
  initialSelectedIds?: ReadonlySet<number>;
  eventFilters?: Omit<EventFilters, 'page' | 'search'>;
}

/**
 * Reusable modal for multi-selecting finance events.
 * Manages its own search and pagination state.
 * Emits the selected Set<number> on confirm.
 */
export function EventMultiSelectModal({
  open,
  onClose,
  title,
  onConfirm,
  confirmLabel,
  minSelection = 1,
  initialSelectedIds = new Set(),
  eventFilters = {},
}: EventMultiSelectModalProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(initialSelectedIds));

  const { data: paged, isLoading, error } = useEvents({ page, ...eventFilters });

  const allEvents = useMemo(() => paged?.content ?? [], [paged]);

  const filteredEvents = useMemo(() => {
    if (!search) return allEvents;
    const q = search.toLowerCase();
    return allEvents.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.category?.name.toLowerCase().includes(q)
    );
  }, [allEvents, search]);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setPage(0);
    setSearch('');
    setSelectedIds(new Set(initialSelectedIds));
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(new Set(selectedIds));
    setPage(0);
    setSearch('');
    setSelectedIds(new Set());
  };

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="space-y-4">
        <EventSelectionList
          events={filteredEvents}
          isLoading={isLoading}
          error={error}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(0); }}
          searchPlaceholder={t('events.searchPlaceholder')}
          emptyStateTitle={search ? t('events.noEventsFoundSearch') : t('events.noEventsFound')}
          onSelectEvent={(event) => handleToggle(event.id)}
          selectionIndicator="checkbox"
          selectedIds={selectedIds}
          maxHeightClass="max-h-[50vh]"
          pagination={{
            page,
            totalPages: paged?.totalPages ?? 1,
            onPageChange: setPage,
            hideWhenSearching: true,
          }}
        />

        {selectedIds.size > 0 && (
          <p className="text-xs text-dn-primary font-medium px-1">
            {t('events.selectedCount', { count: selectedIds.size })}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size < minSelection}>
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
