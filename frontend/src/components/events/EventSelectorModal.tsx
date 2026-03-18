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
  
  const { data: paged, isLoading, error } = useEvents(page);
  const addRelation = useAddEventRelations();

  if (!open) return null;

  const handleSelect = async (selectedId: number) => {
    await addRelation.mutateAsync({ id: baseEventId, relatedIds: [selectedId] });
    onClose();
  };

  const allEvents = paged?.content || [];
  const filtered = allEvents.filter((e) => {
    if (e.id === baseEventId) return false;
    if (existingRelatedIds.includes(e.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.name.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Modal open={open} onClose={onClose} title={t('events.selectRelatedEvent')}>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-xl" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('events.searchPlaceholder')}
            className="w-full bg-dn-surface-low rounded-input pl-10 pr-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30 [color-scheme:dark]"
          />
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
          {isLoading && <div className="py-4 text-center"><Spinner /></div>}
          {error && <div className="py-2 text-center text-dn-error text-sm">{String(error)}</div>}
          
          {!isLoading && !error && filtered.length === 0 && (
            <div className="py-4">
              <EmptyState title={search ? t('events.noEventsFoundSearch') : t('events.noEventsFound')} />
            </div>
          )}

          {filtered.map((evt) => (
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
