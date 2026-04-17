import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvents, useAddEventRelations } from '@/hooks/useEvents';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EventSelectionList } from '@/components/events/EventSelectionList';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useUsageStats, useRecordSelection } from '@/hooks/useSelectionHistory';
import { sortByUsage } from '@/lib/usageSorter';
import type { SortMode } from '@/lib/usageSorter';

const SORT_MODES: SortMode[] = ['smart', 'alphabetical', 'frequency', 'recency'];
type CustomSort = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'category-asc' | 'category-desc';
type SortOption = SortMode | CustomSort;
type SortOptionItem = { value: SortOption; label: string };

function isSortMode(opt: SortOption): opt is SortMode {
  return (SORT_MODES as string[]).includes(opt);
}

export function EventSelectorModal({
  open,
  onClose,
  baseEventId,
  existingRelatedIds,
}: {
  open: boolean;
  onClose: () => void;
  baseEventId: number;
  existingRelatedIds: number[];
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('smart');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: paged, isLoading, error } = useEvents({ page });
  const { data: stats } = useUsageStats('FINANCE_EVENT');
  const recordSelection = useRecordSelection();
  const addRelation = useAddEventRelations();

  if (!open) return null;

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds);
    idsArray.forEach((id) => recordSelection.mutate({ type: 'FINANCE_EVENT', id }));
    await addRelation.mutateAsync({ id: baseEventId, relatedIds: idsArray });
    setSelectedIds(new Set());
    onClose();
  };

  const allEvents = paged?.content || [];
  const filteredEvents = allEvents.filter((e) => {
    if (e.id === baseEventId) return false;
    if (existingRelatedIds.includes(e.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesName = e.name.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
      const matchesCategory = e.category?.name.toLowerCase().includes(q);
      const matchesDate = e.transactionDate?.includes(q);
      return matchesName || matchesCategory || matchesDate;
    }
    return true;
  });

  const sortedEvents = isSortMode(sortBy)
    ? sortByUsage(filteredEvents, stats ?? [], sortBy)
    : [...filteredEvents].sort((a, b) => {
        if (sortBy.startsWith('date')) {
          const val = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
          return sortBy === 'date-asc' ? val : -val;
        } else if (sortBy.startsWith('name')) {
          const val = a.name.localeCompare(b.name);
          return sortBy === 'name-asc' ? val : -val;
        } else {
          const catA = a.category?.name || '';
          const catB = b.category?.name || '';
          const val = catA.localeCompare(catB);
          return sortBy === 'category-asc' ? val : -val;
        }
      });

  const sortOptions: SortOptionItem[] = [
    { value: 'smart', label: t('common.smartSort') },
    { value: 'frequency', label: t('common.frequency') },
    { value: 'recency', label: t('common.recency') },
    { value: 'alphabetical', label: t('common.alphabetical') },
    { value: 'date-desc', label: `${t('events.date')} ↓` },
    { value: 'date-asc', label: `${t('events.date')} ↑` },
    { value: 'name-asc', label: `${t('common.name')} ↑` },
    { value: 'name-desc', label: `${t('common.name')} ↓` },
    { value: 'category-asc', label: `${t('events.category')} ↑` },
    { value: 'category-desc', label: `${t('events.category')} ↓` },
  ];

  return (
    <Modal open={open} onClose={onClose} title={t('events.selectRelatedEvent')}>
      <div className="space-y-4">
        {selectedIds.size > 0 && (
          <p className="text-xs text-dn-primary font-medium px-1">
            {t('events.selectedCount', { count: selectedIds.size })}
          </p>
        )}

        <EventSelectionList
          events={sortedEvents}
          isLoading={isLoading}
          error={error}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('events.searchPlaceholder')}
          emptyStateTitle={search ? t('events.noEventsFoundSearch') : t('events.noEventsFound')}
          onSelectEvent={(event) => handleToggle(event.id)}
          selectionIndicator="radio"
          selectedIds={selectedIds}
          searchTrailing={(
            <div className="shrink-0 w-45">
              <SearchableSelect
                options={sortOptions}
                value={sortBy}
                onChange={(value) => {
                  if (value !== null) {
                    setSortBy(value as SortOption);
                  }
                }}
                className="h-11 py-0 border-0"
              />
            </div>
          )}
          pagination={{
            page,
            totalPages: paged?.totalPages ?? 1,
            onPageChange: setPage,
            hideWhenSearching: true,
          }}
          paginationClassName="pt-2"
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || addRelation.isPending}
          >
            {addRelation.isPending
              ? t('common.loading')
              : t('events.addSelectedRelations', { count: selectedIds.size })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
