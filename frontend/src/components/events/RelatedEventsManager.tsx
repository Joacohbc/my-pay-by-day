import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent, RelatedEvent } from '@/models';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '@/services/events.service';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { EventPickerModal } from './EventPickerModal';

interface RelatedEventsManagerProps {
  event: FinanceEvent;
}

export function RelatedEventsManager({ event }: RelatedEventsManagerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const removeRelationMutation = useMutation({
    mutationFn: (relatedId: number) => eventsService.removeRelation(event.id, relatedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', event.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const handleRemove = (relatedId: number) => {
    if (confirm(t('events.related.confirmRemove', 'Are you sure you want to remove this related event?'))) {
      removeRelationMutation.mutate(relatedId);
    }
  };

  const relatedEvents = event.relatedEvents || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dn-text-muted uppercase tracking-wider">{t('events.related.title', 'Related Events')}</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsPickerOpen(true)}
        >
          <Icon name="add" className="mr-1 text-base" />
          {t('events.related.add', 'Add Relation')}
        </Button>
      </div>

      {relatedEvents.length === 0 ? (
        <p className="text-sm text-dn-text-muted/70 italic bg-dn-surface-low rounded-md p-4 text-center border border-white/5">
          {t('events.related.empty', 'No related events found.')}
        </p>
      ) : (
        <div className="grid gap-3">
          {relatedEvents.map((relatedEvent: RelatedEvent) => (
            <div
              key={relatedEvent.id}
              className="flex items-center justify-between rounded-md border border-white/5 bg-dn-surface p-3 shadow-sm transition-colors hover:border-white/10"
            >
              <div className="grid gap-1">
                <div className="font-medium text-sm text-dn-text-main flex items-center gap-2">
                  <Icon name="sell" className="text-base text-dn-text-muted" />
                  {relatedEvent.name}
                </div>
                <div className="text-xs text-dn-text-muted flex items-center gap-2">
                  <span className="flex items-center">
                    <Icon name="calendar_today" className="text-sm mr-1 opacity-70" />
                    {formatDateTime(relatedEvent.transactionDate)}
                  </span>
                  <span className={`flex items-center font-mono ${relatedEvent.type === 'INBOUND' ? 'text-dn-success' : relatedEvent.type === 'OUTBOUND' ? 'text-dn-error' : 'text-dn-text-main'}`}>
                    <Icon name="attach_money" className="text-sm mr-0.5 opacity-70" />
                    {formatCurrency(relatedEvent.amount)}
                  </span>
                  <span className="rounded bg-dn-surface-low px-1.5 py-0.5 text-[10px] uppercase text-dn-text-main/80 font-medium">
                    {t(`events.types.${relatedEvent.type.toLowerCase()}`, relatedEvent.type)}
                  </span>
                </div>
              </div>

              <Button
                variant="danger"
                size="sm"
                className="shrink-0 bg-transparent text-dn-error hover:bg-dn-error/10 border-0 shadow-none"
                onClick={() => handleRemove(relatedEvent.id)}
                disabled={removeRelationMutation.isPending}
                title={t('common.remove', 'Remove')}
              >
                <Icon name="delete" className="text-base" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {isPickerOpen && (
        <EventPickerModal
          currentEventId={event.id}
          existingRelatedIds={relatedEvents.map(e => e.id)}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
}