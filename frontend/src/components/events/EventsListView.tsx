import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent } from '@/models';
import type { DateField } from '@/services/events.service';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export interface AdvancedFiltersState {
  startDate: string;
  endDate: string;
  dateField: DateField;
  categoryId?: number;
  tagId?: number;
}

export interface FilterPill {
  label: string;
  value: string;
  badge?: number;
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
  showDateField?: boolean;

  filterPills?: FilterPill[];
  activePill?: string;
  onPillChange?: (value: string) => void;

  renderItem?: (event: FinanceEvent) => ReactNode;
  keyResolver?: (event: FinanceEvent) => string | number;

  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

const EMPTY_FILTERS: AdvancedFiltersState = {
  startDate: '',
  endDate: '',
  dateField: 'TRANSACTION',
  categoryId: undefined,
  tagId: undefined,
};

function hasAnyAdvanced(filters: AdvancedFiltersState): boolean {
  return Boolean(
    filters.startDate ||
      filters.endDate ||
      filters.categoryId ||
      filters.tagId ||
      filters.dateField !== 'TRANSACTION'
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
  showDateField = true,
  filterPills,
  activePill,
  onPillChange,
  renderItem,
  keyResolver,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: EventsListViewProps) {
  const { t } = useTranslation();

  const { data: categoriesResponse } = useCategories();
  const categories = Array.isArray(categoriesResponse)
    ? categoriesResponse
    : categoriesResponse?.content || [];

  const { data: tagsResponse } = useTags();
  const tags = Array.isArray(tagsResponse) ? tagsResponse : tagsResponse?.content || [];

  const supportsAdvancedFilters = !!advancedFilters && !!onAdvancedFiltersChange;
  const filtersValue = advancedFilters ?? EMPTY_FILTERS;
  const hasAdvancedFilters = hasAnyAdvanced(filtersValue);
  const hasActiveFilters = Boolean(
    search || (activePill && activePill !== 'ALL') || hasAdvancedFilters
  );

  const [showFilters, setShowFilters] = useState(hasAdvancedFilters);

  const updateAdvanced = (patch: Partial<AdvancedFiltersState>) => {
    onAdvancedFiltersChange?.({ ...filtersValue, ...patch });
  };

  const toggleFilters = () => {
    if (showFilters && supportsAdvancedFilters) {
      onAdvancedFiltersChange?.(EMPTY_FILTERS);
    }
    setShowFilters((previous) => !previous);
  };

  const showPagination =
    typeof page === 'number' && typeof totalPages === 'number' && !!onPageChange;

  return (
    <>
      <div className="px-5 flex items-center gap-2">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-xl"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? t('events.searchPlaceholder')}
            className="w-full bg-dn-surface-low rounded-input pl-10 pr-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30 scheme-dark"
          />
        </div>
        {supportsAdvancedFilters && (
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            className="shrink-0 aspect-square p-0 w-4 flex items-center justify-center rounded-input"
            onClick={toggleFilters}
          >
            {showFilters ? (
              <Icon name="filter_alt_off" className="text-xl" />
            ) : (
              <Icon name="filter_alt" className="text-xl" />
            )}
          </Button>
        )}
      </div>

      {supportsAdvancedFilters && showFilters && (
        <div className="space-y-4 rounded-3xl p-4 mx-5 border border-white/5">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-dn-text-main">{t('common.filters')}</span>
            {hasActiveFilters && onClearFilters && (
              <button
                onClick={onClearFilters}
                className="text-xs text-dn-primary font-medium hover:text-dn-primary/80"
              >
                {t('common.clearFilters')}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {showDateField && (
              <SearchableSelect
                label={t('events.dateField')}
                value={filtersValue.dateField}
                options={[
                  { value: 'TRANSACTION', label: t('events.dateFieldTransaction') },
                  { value: 'CREATED', label: t('events.dateFieldCreated') },
                  { value: 'UPDATED', label: t('events.dateFieldUpdated') },
                ]}
                onChange={(val) =>
                  updateAdvanced({ dateField: ((val as DateField) || 'TRANSACTION') })
                }
                placeholder={t('events.dateField')}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label={t('events.startDate')}
                value={filtersValue.startDate}
                onChange={(e) => updateAdvanced({ startDate: e.target.value })}
              />
              <Input
                type="date"
                label={t('events.endDate')}
                value={filtersValue.endDate}
                onChange={(e) => updateAdvanced({ endDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SearchableSelect
                label={t('common.category')}
                value={filtersValue.categoryId ?? 0}
                options={[
                  { value: '', label: t('common.all') },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                onChange={(val) =>
                  updateAdvanced({ categoryId: val ? Number(val) : undefined })
                }
                placeholder={t('common.category')}
              />
              <SearchableSelect
                label={t('common.tag')}
                value={filtersValue.tagId ?? 0}
                options={[
                  { value: '', label: t('common.all') },
                  ...tags.map((tag) => ({ value: tag.id, label: tag.name })),
                ]}
                onChange={(val) => updateAdvanced({ tagId: val ? Number(val) : undefined })}
                placeholder={t('common.tag')}
              />
            </div>
          </div>
        </div>
      )}

      {filterPills && filterPills.length > 0 && (
        <div className="px-5">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filterPills.map(({ label, value, badge }) => (
              <button
                key={value}
                onClick={() => onPillChange?.(value)}
                className={[
                  'shrink-0 px-4 py-1.5 rounded-pill text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
                  activePill === value
                    ? 'bg-dn-primary/20 text-dn-primary'
                    : 'bg-dn-surface-low text-dn-text-muted hover:bg-dn-surface',
                ].join(' ')}
              >
                {label}
                {typeof badge === 'number' && badge > 0 && (
                  <span className="bg-dn-error text-white text-[10px] leading-tight font-semibold px-1.5 py-0.5 rounded-full min-w-4.5 text-center inline-block">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5">
        {events.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        ) : (
          <Card className="divide-y divide-white/5">
            {events.map((event) => (
              <div
                key={keyResolver ? keyResolver(event) : event.id}
                className="py-3 first:pt-0 last:pb-0"
              >
                {renderItem ? renderItem(event) : <EventCard event={event} />}
              </div>
            ))}
          </Card>
        )}
      </div>

      {showPagination && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}
