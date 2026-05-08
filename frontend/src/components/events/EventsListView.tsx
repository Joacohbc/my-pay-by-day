import { useState, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent } from '@/models';
import type { DateField } from '@/services/events.service';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { EventCard } from '@/components/events/EventCard';
import { Icon } from '@/components/ui/Icon';
import { EventSearchbarFilter, type PillsConfig, type EventSearchbarFilterHandle } from '@/components/events/EventSearchbarFilter';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';

export interface AdvancedFiltersState {
  startDate: string;
  endDate: string;
  dateField: DateField;
  categoryIds: number[];
  tagIds: number[];
  nodeId?: number;
  minAmount?: number;
  maxAmount?: number;
}


export interface EventsListViewProps {
  events: FinanceEvent[];
  isLoading?: boolean;

  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;

  advancedFilters?: AdvancedFiltersState;
  onAdvancedFiltersChange?: (next: AdvancedFiltersState) => void;
  onClearFilters?: () => void;

  pills?: PillsConfig;

  renderItem?: (event: FinanceEvent) => ReactNode;
  keyResolver?: (event: FinanceEvent) => string | number;
  from?: string;

  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

const EMPTY_FILTERS: AdvancedFiltersState = {
  startDate: '',
  endDate: '',
  dateField: 'TRANSACTION',
  categoryIds: [],
  tagIds: [],
  nodeId: undefined,
};

function hasAnyAdvanced(filters: AdvancedFiltersState): boolean {
  return Boolean(
    filters.startDate ||
      filters.endDate ||
      filters.categoryIds.length ||
      filters.tagIds.length ||
      filters.nodeId ||
      filters.dateField !== 'TRANSACTION' ||
      filters.minAmount !== undefined ||
      filters.maxAmount !== undefined
  );
}

export function EventsListView({
  events,
  search,
  onSearchChange,
  searchPlaceholder,
  page,
  totalPages,
  onPageChange,
  advancedFilters,
  onAdvancedFiltersChange,
  onClearFilters,
  pills,
  renderItem,
  keyResolver,
  from,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: EventsListViewProps) {
  const { t } = useTranslation();


  const { data: nodesResponse } = useNodes();
  const nodes = Array.isArray(nodesResponse)
    ? nodesResponse
    : nodesResponse || [];

  const { data: categoriesResponse } = useCategories();
  const categories = Array.isArray(categoriesResponse)
    ? categoriesResponse
    : categoriesResponse || [];

  const { data: tagsResponse } = useTags();
  const tags = Array.isArray(tagsResponse) ? tagsResponse : tagsResponse || [];

  const filtersValue = advancedFilters ?? EMPTY_FILTERS;
  const hasAdvancedFilters = hasAnyAdvanced(filtersValue);

  const [showFilters, setShowFilters] = useState(hasAdvancedFilters);

  const [iconSource, setIconSource] = useState<'category' | 'node'>(
    () => (localStorage.getItem('events-icon-source') as 'category' | 'node') ?? 'category'
  );

  const toggleIconSource = () => {
    const next = iconSource === 'category' ? 'node' : 'category';
    setIconSource(next);
    localStorage.setItem('events-icon-source', next);
  };

  const updateAdvanced = (patch: Partial<AdvancedFiltersState>) => {
    onAdvancedFiltersChange?.({ ...filtersValue, ...patch });
  };

  const toggleCategory = (id: number) => {
    const next = filtersValue.categoryIds.includes(id)
      ? filtersValue.categoryIds.filter((c) => c !== id)
      : [...filtersValue.categoryIds, id];
    updateAdvanced({ categoryIds: next });
  };

  const toggleTag = (id: number) => {
    const next = filtersValue.tagIds.includes(id)
      ? filtersValue.tagIds.filter((t) => t !== id)
      : [...filtersValue.tagIds, id];
    updateAdvanced({ tagIds: next });
  };

  const filterRef = useRef<EventSearchbarFilterHandle>(null);

  const resetFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      onAdvancedFiltersChange?.(EMPTY_FILTERS);
    }
    filterRef.current?.reset();
  };

  const showPagination =
    typeof page === 'number' && typeof totalPages === 'number' && !!onPageChange;

  return (
    <>
      <div className='px-5 space-y-4'>
        <EventSearchbarFilter
          ref={filterRef}
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder ?? t('events.searchPlaceholder')}
          showFilters={showFilters}
          hasAnyFilter={hasAdvancedFilters}
          filters={filtersValue}
          categories={categories}
          tags={tags}
          nodes={nodes}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onResetFilters={resetFilters}
          onToggleCategory={toggleCategory}
          onToggleTag={toggleTag}
          onDateFieldChange={(f) => updateAdvanced({ dateField: f })}
          onDateRangeChange={(s, e) => updateAdvanced({ startDate: s, endDate: e })}
          onNodeIdChange={(id) => updateAdvanced({ nodeId: id })}
          onMinAmountChange={(v) => updateAdvanced({ minAmount: v })}
          onMaxAmountChange={(v) => updateAdvanced({ maxAmount: v })}
          pills={pills}
        />
      </div>

      <div className="px-5">
        {events.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        ) : (
          <>
            <div className="flex justify-end mb-2">
              <button
                onClick={toggleIconSource}
                title={iconSource === 'category' ? t('events.iconSourceNode') : t('events.iconSourceCategory')}
                className="flex items-center gap-1 text-xs text-dn-text-muted hover:text-dn-text-main transition-colors px-2 py-1 rounded-md hover:bg-dn-surface"
              >
                <Icon name={iconSource === 'category' ? 'category' : 'account_balance_wallet'} className="text-sm" />
                <span>{iconSource === 'category' ? t('events.iconSourceCategory') : t('events.iconSourceNode')}</span>
              </button>
            </div>
            <Card className="divide-y divide-white/5">
              {events.map((event) => (
                <div
                  key={keyResolver ? keyResolver(event) : event.id}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  {renderItem ? renderItem(event) : <EventCard event={event} from={from} iconSource={iconSource} />}
                </div>
              ))}
            </Card>
          </>
        )}
      </div>

      {showPagination && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}
