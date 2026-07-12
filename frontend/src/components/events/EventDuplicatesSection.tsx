import { useTranslation } from 'react-i18next';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/lib/routes';
import { useEntityDuplicates, useResolveDuplicate } from '@/hooks/useDuplicates';
import { useEvent } from '@/hooks/useEvents';
import { useAlert } from '@/contexts/AlertContext';
import { EventCard } from '@/components/events/EventCard';
import type { FinanceEvent, DuplicateEventRecord } from '@/models';

function ScorePill({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-dn-surface text-xs text-dn-text-muted">
      {label}: <span className="font-mono text-dn-text-main">{pct}%</span>
    </span>
  );
}

function DuplicateEventCard({
  record,
  currentEventId,
}: {
  record: DuplicateEventRecord;
  currentEventId: number;
}) {
  const { t } = useTranslation();
  const { navigatePush } = useAppNavigation();
  const alert = useAlert();
  const resolve = useResolveDuplicate();
  const otherId = record.entityId1 === currentEventId ? record.entityId2 : record.entityId1;
  const { data: otherEvent } = useEvent(otherId);

  const handleNotDuplicate = () => {
    resolve.mutate(
      { id: record.id, request: { action: 'ACCEPTED_NOT_DUPLICATE' } },
      { onError: () => alert.error(t('common.error')) }
    );
  };

  const handleDeleteOther = () => {
    resolve.mutate(
      { id: record.id, request: { action: 'RESOLVED_MERGED', keepEntityId: currentEventId } },
      { onError: () => alert.error(t('common.error')) }
    );
  };

  const fakeEvent = otherEvent
    ? otherEvent
    : ({ id: otherId, name: `#${otherId}`, type: 'OTHER', lineItems: [], tags: [] } as unknown as FinanceEvent);

  return (
    <div className="p-2 flex items-center gap-3 border border-transparent hover:border-dn-primary/50 transition-colors rounded-2xl">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <EventCard event={fakeEvent} disableLink />
          </div>
          <span className="shrink-0 text-sm font-mono font-semibold text-dn-text-main pr-1">
            {Math.round(record.score * 100)}%
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          <ScorePill label={t('duplicates.section.dateScore')} value={record.dateScore} />
          <ScorePill label={t('duplicates.section.amountScore')} value={record.amountScore} />
          <ScorePill label={t('duplicates.section.nodeScore')} value={record.nodeScore} />
          <ScorePill label={t('duplicates.section.categoryScore')} value={record.categoryScore} />
          <ScorePill label={t('duplicates.section.tagScore')} value={record.tagScore} />
          <ScorePill label={t('duplicates.section.nameScore')} value={record.nameScore} />
        </div>
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        <button
          type="button"
          onClick={() => navigatePush(Routes.EVENT_DETAIL(otherId))}
          title={t('duplicates.section.openEvent')}
          className="flex items-center justify-center rounded-full p-2 text-dn-text-muted hover:bg-dn-surface hover:text-dn-text-main transition-colors"
        >
          <Icon name="open_in_new" className="text-xl" />
        </button>
        <button
          type="button"
          onClick={handleNotDuplicate}
          disabled={resolve.isPending}
          title={t('duplicates.section.markNotDuplicate')}
          className="flex items-center justify-center rounded-full p-2 text-dn-success hover:bg-dn-success/10 transition-colors disabled:opacity-50"
        >
          <Icon name="check_circle" className="text-xl" />
        </button>
        <button
          type="button"
          onClick={handleDeleteOther}
          disabled={resolve.isPending}
          title={t('duplicates.section.deleteOther')}
          className="flex items-center justify-center rounded-full p-2 text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
        >
          <Icon name="delete" className="text-xl" />
        </button>
      </div>
    </div>
  );
}

export function EventDuplicatesSection({ event }: { event: FinanceEvent }) {
  const { t } = useTranslation();
  const { data: duplicates, isLoading } = useEntityDuplicates('FINANCE_EVENT', event.id, 'PENDING');

  return (
    <div className="px-5">
      <h3 className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
        <Icon name="find_replace" className="text-base" />
        {t('duplicates.section.title')}
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : !duplicates?.length ? (
        <EmptyState title={t('duplicates.section.noDuplicates')} />
      ) : (
        <div className="divide-y divide-white/5">
          {duplicates.map((record) => (
            <DuplicateEventCard
              key={record.id}
              record={record as DuplicateEventRecord}
              currentEventId={event.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
