import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { useEventModalFilters } from '@/hooks/useEventModalFilters';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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
  /** Static filters pre-applied by the caller (merged with the user's interactive filters). */
  eventFilters?: Omit<EventFilters, 'page' | 'search'>;
}

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

  const allEvents = useMemo(() => paged?.content ?? [], [paged]);

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
    resetFilters();
    setShowFilters(false);
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
    if (showFilters && hasAnyFilter) resetFilters();
    setShowFilters((v) => !v);
  };

  const filterButton = (
    <Button
      variant={showFilters ? 'primary' : 'secondary'}
      className="shrink-0 aspect-square p-0 w-4 flex items-center justify-center rounded-input"
      onClick={toggleFilters}
    >
      {showFilters ? (
        <Icon name="filter_alt_off" className="text-xl" />
      ) : (
        <Icon name="filter_alt" className={`text-xl${hasAnyFilter ? ' text-dn-primary' : ''}`} />
      )}
    </Button>
  );

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="space-y-4">
        {/* Filter panel */}
        {showFilters && (
          <div className="space-y-4 rounded-3xl p-4 border border-white/5">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-dn-text-main">{t('common.filters')}</span>
              {hasAnyFilter && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-dn-primary font-medium hover:text-dn-primary/80"
                >
                  {t('common.clearFilters')}
                </button>
              )}
            </div>

            <SearchableSelect
              label={t('events.dateField')}
              value={filters.dateField}
              options={[
                { value: 'TRANSACTION', label: t('events.dateFieldTransaction') },
                { value: 'CREATED', label: t('events.dateFieldCreated') },
                { value: 'UPDATED', label: t('events.dateFieldUpdated') },
              ]}
              onChange={(val) => setDateField((val as 'TRANSACTION' | 'CREATED' | 'UPDATED') || 'TRANSACTION')}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label={t('events.startDate')}
                value={filters.startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                label={t('events.endDate')}
                value={filters.endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {categories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">
                  {t('common.category')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { toggleCategory(c.id); setPage(0); }}
                      className={[
                        'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer',
                        filters.categoryIds.includes(c.id)
                          ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                          : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
                      ].join(' ')}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">
                  {t('common.tag')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => { toggleTag(tag.id); setPage(0); }}
                      className={[
                        'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer',
                        filters.tagIds.includes(tag.id)
                          ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                          : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
                      ].join(' ')}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {nodes.length > 0 && (
              <SearchableSelect
                label={t('events.filterNode')}
                value={filters.nodeId ?? ''}
                options={[
                  { value: '', label: t('events.filterNodePlaceholder') },
                  ...nodes.map((n) => ({ value: n.id, label: n.name })),
                ]}
                onChange={(val) => { setNodeId(val ? Number(val) : undefined); setPage(0); }}
                placeholder={t('events.filterNodePlaceholder')}
              />
            )}
          </div>
        )}

        <EventSelectionList
          events={allEvents}
          isLoading={isLoading}
          error={error}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(0); }}
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
