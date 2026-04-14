import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvents, useAddEventRelations } from '@/hooks/useEvents';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { useUsageStats, useRecordSelection } from '@/hooks/useSelectionHistory';
import { sortByUsage } from '@/lib/usageSorter';
import type { SortMode } from '@/lib/usageSorter';

const SORT_MODES: SortMode[] = ['smart', 'alphabetical', 'frequency', 'recency'];
type CustomSort = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'category-asc' | 'category-desc';
type SortOption = SortMode | CustomSort;

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

  const { data: paged, isLoading, error } = useEvents({ page });
  const { data: stats } = useUsageStats('FINANCE_EVENT');
  const recordSelection = useRecordSelection();
  const addRelation = useAddEventRelations();

  if (!open) return null;

  const handleSelect = async (selectedId: number) => {
    recordSelection.mutate({ type: 'FINANCE_EVENT', id: selectedId });
    await addRelation.mutateAsync({ id: baseEventId, relatedIds: [selectedId] });
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

  return (
    <Modal open={open} onClose={onClose} title={t('events.selectRelatedEvent')}>
      <div className="space-y-4">
        {/* Search & Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-xl" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('events.searchPlaceholder')}
              className="w-full bg-dn-surface-low rounded-input pl-10 pr-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30 [color-scheme:dark]"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-dn-surface-low rounded-input px-3 py-3 text-sm text-dn-text-main focus:outline-none focus:ring-2 focus:ring-dn-primary/30"
          >
            <option value="smart">{t('common.smartSort')}</option>
            <option value="frequency">{t('common.frequency')}</option>
            <option value="recency">{t('common.recency')}</option>
            <option value="alphabetical">{t('common.alphabetical')}</option>
            <option value="date-desc">{t('events.date')} ↓</option>
            <option value="date-asc">{t('events.date')} ↑</option>
            <option value="name-asc">{t('common.name')} ↑</option>
            <option value="name-desc">{t('common.name')} ↓</option>
            <option value="category-asc">{t('events.category')} ↑</option>
            <option value="category-desc">{t('events.category')} ↓</option>
          </select>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
          {isLoading && <div className="py-4 text-center"><Spinner /></div>}
          {error && <div className="py-2 text-center text-dn-error text-sm">{String(error)}</div>}
          
          {!isLoading && !error && sortedEvents.length === 0 && (
            <div className="py-4">
              <EmptyState title={search ? t('events.noEventsFoundSearch') : t('events.noEventsFound')} />
            </div>
          )}

          {sortedEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={() => handleSelect(evt.id)}
              className="group border border-transparent hover:border-dn-primary/50 transition-colors cursor-pointer rounded-2xl"
            >
              <EventCard event={evt} disableLink />
            </div>
          ))}
        </div>

        {!search && paged && paged.totalPages > 1 && (
          <div className="pt-2">
            <Pagination page={page} totalPages={paged.totalPages} onPageChange={setPage} />
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
