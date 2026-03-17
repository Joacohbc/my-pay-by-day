import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '@/services/events.service';
import type { FinanceEvent } from '@/models';
import { formatDateTime } from '@/lib/format';
import { formatCurrency } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

interface EventPickerModalProps {
  currentEventId: number;
  existingRelatedIds: number[];
  onClose: () => void;
}

export function EventPickerModal({ currentEventId, existingRelatedIds, onClose }: EventPickerModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Fetch a larger page for simplicity, ideally a dedicated search endpoint or paginated table
  const { data: pagedResponse, isLoading } = useQuery({
    queryKey: ['events', 'picker'],
    queryFn: () => eventsService.getAll(0, 100),
  });

  const addRelationMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await eventsService.addRelation(currentEventId, id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', currentEventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onClose();
    },
  });

  const allEvents = pagedResponse?.content || [];

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event: FinanceEvent) => {
      // Exclude current event and already related events
      if (event.id === currentEventId || existingRelatedIds.includes(event.id)) {
        return false;
      }

      const search = searchTerm.toLowerCase();
      const matchName = event.name.toLowerCase().includes(search);
      const matchType = event.type.toLowerCase().includes(search);
      const matchCategory = event.category?.name?.toLowerCase().includes(search);
      return matchName || matchType || matchCategory;
    }).sort((a: FinanceEvent, b: FinanceEvent) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [allEvents, searchTerm, currentEventId, existingRelatedIds]);

  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleConfirm = () => {
    if (selectedIds.size > 0) {
      addRelationMutation.mutate(Array.from(selectedIds));
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-xl bg-dn-surface p-6 shadow-xl border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-dn-text-main">
            {t('events.related.selectTitle', 'Select Events to Relate')}
          </h2>
          <button
            onClick={onClose}
            className="text-dn-text-muted hover:text-dn-text-main transition-colors"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="relative mb-4">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted" />
          <input
            type="text"
            className="flex h-10 w-full rounded-md border border-white/10 bg-dn-surface-low px-9 py-2 text-sm text-dn-text-main placeholder:text-dn-text-muted/50 focus:outline-none focus:ring-2 focus:ring-dn-primary/30"
            placeholder={t('common.search', 'Search...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto max-h-96 border border-white/10 rounded-md bg-dn-surface-low/50">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Icon name="autorenew" className="animate-spin text-dn-text-muted" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-dn-text-muted">
              {t('events.related.noResults', 'No events found.')}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredEvents.map((event: FinanceEvent) => {
                const isSelected = selectedIds.has(event.id);
                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-dn-surface-low transition-colors ${
                      isSelected ? 'bg-dn-primary/5' : ''
                    }`}
                    onClick={() => toggleSelection(event.id)}
                  >
                    <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                      isSelected ? 'bg-dn-primary border-dn-primary text-white' : 'border-white/20'
                    }`}>
                      {isSelected && <Icon name="check" className="text-[14px]" />}
                    </div>

                    <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                      <div className="font-medium truncate col-span-2 text-dn-text-main">
                        {event.name}
                      </div>
                      <div className="text-right text-dn-text-muted font-mono">
                        {formatCurrency(
                          event.lineItems.reduce((sum, item) => sum + (item.amount > 0 ? item.amount : 0), 0)
                        )}
                      </div>
                      <div className="col-span-3 text-xs text-dn-text-muted flex gap-4">
                        <span>{formatDateTime(event.transactionDate)}</span>
                        <span>{event.category?.name || t('events.uncategorized', 'Uncategorized')}</span>
                        <span className="uppercase">{event.type}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-dn-surface-low hover:bg-dn-surface text-dn-text-main h-10 px-4 py-2 border border-white/5"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={addRelationMutation.isPending || selectedIds.size === 0}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-dn-primary text-white hover:bg-dn-primary/90 h-10 px-4 py-2"
          >
            {addRelationMutation.isPending && (
              <Icon name="autorenew" className="mr-2 animate-spin text-sm" />
            )}
            {t('events.related.confirmAdd', 'Add {{count}} Relation(s)', { count: selectedIds.size })}
          </button>
        </div>
      </div>
    </div>
  );
}