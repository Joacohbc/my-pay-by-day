import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import type { FinanceEvent } from '@/models';

export type EventSelectionIndicator = 'none' | 'radio' | 'checkbox';

type EventSelectionListPagination = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hideWhenSearching?: boolean;
  isLoading?: boolean;
};

type EventSelectionListProps = {
  events: FinanceEvent[];
  isLoading: boolean;
  error: unknown;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  emptyStateTitle: string;
  onSelectEvent?: (event: FinanceEvent) => void;
  selectedIds?: ReadonlySet<number>;
  selectionIndicator?: EventSelectionIndicator;
  searchTrailing?: ReactNode;
  pagination?: EventSelectionListPagination;
  paginationClassName?: string;
  maxHeightClass?: string;
  selectionIdResolver?: (event: FinanceEvent) => number;
};

export function EventSelectionList({
  events,
  isLoading,
  error,
  search,
  onSearchChange,
  searchPlaceholder,
  emptyStateTitle,
  onSelectEvent,
  selectedIds,
  selectionIndicator = 'none',
  searchTrailing,
  pagination,
  paginationClassName,
  maxHeightClass = 'max-h-[60vh]',
  selectionIdResolver,
}: EventSelectionListProps) {
  const hasSelectionIndicator = selectionIndicator !== 'none';
  const canSelectEvent = !!onSelectEvent;
  const resolveSelectionId = selectionIdResolver ?? ((event: FinanceEvent) => event.id);

  const shouldRenderPagination =
    !!pagination &&
    pagination.totalPages > 1 &&
    !(pagination.hideWhenSearching && search?.length ? search.length > 0 : false);

  return (
    <>
      {search !== undefined && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-xl" />
            <input
              value={search}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-dn-surface-low rounded-input pl-10 pr-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30 scheme-dark"
            />
          </div>
          {searchTrailing}
        </div>
      )}

      <div className={[maxHeightClass, 'overflow-y-auto pr-1 space-y-2'].join(' ')}>
        {isLoading && <div className="py-4 text-center"><Spinner /></div>}
        {!!error && (
          <div className="py-2 text-center text-dn-error text-sm">
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {!isLoading && !error && events.length === 0 && (
          <div className="py-4">
            <EmptyState title={emptyStateTitle} />
          </div>
        )}

        {events.map((event) => {
          const selectionId = resolveSelectionId(event);
          const isSelected = selectedIds?.has(selectionId) ?? false;
          return (
            <div
              key={event.id}
              onClick={canSelectEvent ? () => onSelectEvent(event) : undefined}
              className={[
                'border transition-colors rounded-2xl flex items-center gap-2 pr-3',
                canSelectEvent ? 'cursor-pointer' : '',
                isSelected && hasSelectionIndicator
                  ? 'border-dn-primary bg-dn-primary/5'
                  : 'border-transparent',
                canSelectEvent && !isSelected ? 'hover:border-dn-primary/50' : '',
              ].join(' ')}
            >
              <div className="flex-1 min-w-0">
                <EventCard event={event} disableLink />
              </div>
              {hasSelectionIndicator && (
                <div className={[
                  'shrink-0 w-5 h-5 border-2 flex items-center justify-center transition-colors',
                  selectionIndicator === 'radio' ? 'rounded-full' : 'rounded',
                  isSelected ? 'border-dn-primary bg-dn-primary' : 'border-dn-text-muted',
                ].join(' ')}>
                  {isSelected && <Icon name="check" className="text-xs text-white" />}
                </div>
              )}
            </div>
          );
        })}
        
        {shouldRenderPagination && pagination && (
          <div className={paginationClassName}>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={pagination.onPageChange}
              isLoading={pagination.isLoading}
            />
          </div>
        )}
      </div>
    </>
  );
}