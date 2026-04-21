import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { useEventModalFilters } from '@/hooks/useEventModalFilters';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EventSelectionList } from '@/components/events/EventSelectionList';
import { EventSearchbarFilter } from '@/components/events/EventSearchbarFilter';
import type { EventFilters } from '@/services/events.service';

interface EventMultiSelectModalProps {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
  title: string;
  onConfirm: (selectedIds: Set<number>) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  minSelection?: number;
  maxSelection?: number;
  initialSelectedIds?: ReadonlySet<number>;
  excludeEventIds?: ReadonlySet<number>;
  /** Static filters pre-applied by the caller (merged with the user's interactive filters). */
  eventFilters?: Omit<EventFilters, 'page' | 'search'>;
}

export function EventMultiSelectModal({
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
  excludeEventIds = new Set(),
  eventFilters = {},
}: EventMultiSelectModalProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(initialSelectedIds));
  const [showFilters, setShowFilters] = useState(false);

  const {
    filters,
    hasAnyFilter,
    reset: resetFilters,
    toEventFilters,
    toggleTag,
    toggleCategory,
    setDateField,
    setStartDate,
    setEndDate,
    setNodeId,
  } = useEventModalFilters();

  const { data: categoriesResponse } = useCategories();
  const categories = useMemo(
    () => (Array.isArray(categoriesResponse) ? categoriesResponse : categoriesResponse?.content ?? []),
    [categoriesResponse]
  );

  const { data: tagsResponse } = useTags();
  const tags = useMemo(
    () => (Array.isArray(tagsResponse) ? tagsResponse : tagsResponse?.content ?? []).filter((t) => !t.archived),
    [tagsResponse]
  );

  const { data: nodesPaged } = useNodes();
  const nodes = useMemo(() => nodesPaged?.content ?? [], [nodesPaged]);

  const combinedFilters: EventFilters = useMemo(
    () => ({ ...eventFilters, ...toEventFilters(), page, search }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventFilters, filters, page, search]
  );

  const { data: paged, isLoading, error } = useEvents(combinedFilters);

  const allEvents = useMemo(
    () => (paged?.content ?? []).filter((event) => !excludeEventIds.has(event.id)),
    [excludeEventIds, paged]
  );

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      if (maxSelection === 1) {
        if (prev.has(id)) return new Set<number>();
        return new Set<number>([id]);
      }

      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (!maxSelection || next.size < maxSelection) next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setPage(0);
    setSearch('');
    setSelectedIds(new Set(initialSelectedIds));
    resetFilters();
    setShowFilters(false);
    onClose();
  };

  const handleCancel = () => {
    setPage(0);
    setSearch('');
    setSelectedIds(new Set(initialSelectedIds));
    resetFilters();
    setShowFilters(false);
    if (onCancel) {
      onCancel();
      return;
    }
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(new Set(selectedIds));
    setPage(0);
    setSearch('');
    setSelectedIds(new Set());
    resetFilters();
    setShowFilters(false);
  };

  const toggleFilters = () => {
    setShowFilters((v) => !v);
  };

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="space-y-4">
        <EventSearchbarFilter
          showFilters={showFilters}
          hasAnyFilter={hasAnyFilter}
          filters={filters}
          categories={categories}
          tags={tags}
          nodes={nodes}
          onToggleFilters={toggleFilters}
          onResetFilters={resetFilters}
          onToggleCategory={toggleCategory}
          onToggleTag={toggleTag}
          onDateFieldChange={setDateField}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onNodeIdChange={setNodeId}
          onPageReset={() => setPage(0)}
        >
          {(filterButton) => (
            <EventSelectionList
              events={allEvents}
              isLoading={isLoading}
              error={error}
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(0);
              }}
              searchPlaceholder={t('events.searchPlaceholder')}
              emptyStateTitle={search || hasAnyFilter ? t('events.noEventsFoundSearch') : t('events.noEventsFound')}
              onSelectEvent={(event) => handleToggle(event.id)}
              selectionIndicator="checkbox"
              selectedIds={selectedIds}
              searchTrailing={filterButton}
              maxHeightClass="max-h-[40vh]"
              pagination={{
                page,
                totalPages: paged?.totalPages ?? 1,
                onPageChange: setPage,
                hideWhenSearching: false,
              }}
            />
          )}
        </EventSearchbarFilter>

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
