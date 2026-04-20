import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Routes } from '@/lib/routes';
import { useDuplicates, useResolveDuplicate } from '@/hooks/useDuplicates';
import { useEvent } from '@/hooks/useEvents';
import { useAlert } from '@/contexts/AlertContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import { EventCard } from '@/components/events/EventCard';
import type { FinanceEvent, DuplicateEventRecord } from '@/models';

function ScorePill({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-dn-surface text-xs text-dn-text-muted">
      {label}: <span className="font-mono text-dn-text-main">{Math.round(value * 100)}%</span>
    </span>
  );
}

function DuplicatePairCard({ record, index }: { record: DuplicateEventRecord; index: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const alert = useAlert();
  const resolve = useResolveDuplicate();

  const { data: event1 } = useEvent(record.entityId1);
  const { data: event2 } = useEvent(record.entityId2);

  const fake1 = event1 ?? ({ id: record.entityId1, name: `#${record.entityId1}`, type: 'OTHER', lineItems: [], tags: [] } as unknown as FinanceEvent);
  const fake2 = event2 ?? ({ id: record.entityId2, name: `#${record.entityId2}`, type: 'OTHER', lineItems: [], tags: [] } as unknown as FinanceEvent);

  const handleNotDuplicate = () => {
    resolve.mutate(
      { id: record.id, request: { action: 'ACCEPTED_NOT_DUPLICATE' } },
      { onError: () => alert.error(t('common.error')) }
    );
  };

  const handleKeep1 = () => {
    resolve.mutate(
      { id: record.id, request: { action: 'RESOLVED_MERGED', keepEntityId: record.entityId1 } },
      { onError: () => alert.error(t('common.error')) }
    );
  };

  const handleKeep2 = () => {
    resolve.mutate(
      { id: record.id, request: { action: 'RESOLVED_MERGED', keepEntityId: record.entityId2 } },
      { onError: () => alert.error(t('common.error')) }
    );
  };

  return (
    <div className="rounded-card border border-white/10 bg-dn-surface-low p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
          {t('duplicates.list.pair', { index })}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-mono font-semibold text-dn-primary">
            {Math.round(record.score * 100)}%
          </span>
          <button
            type="button"
            onClick={handleNotDuplicate}
            disabled={resolve.isPending}
            title={t('duplicates.section.markNotDuplicate')}
            className="flex items-center justify-center rounded-full p-1.5 text-dn-success hover:bg-dn-success/10 transition-colors disabled:opacity-50"
          >
            <Icon name="check_circle" className="text-lg" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <ScorePill label={t('duplicates.section.dateScore')} value={record.dateScore} />
        <ScorePill label={t('duplicates.section.amountScore')} value={record.amountScore} />
        <ScorePill label={t('duplicates.section.nodeScore')} value={record.nodeScore} />
        <ScorePill label={t('duplicates.section.categoryScore')} value={record.categoryScore} />
        <ScorePill label={t('duplicates.section.tagScore')} value={record.tagScore} />
        <ScorePill label={t('duplicates.section.nameScore')} value={record.nameScore} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <EventCard event={fake1} disableLink />
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => navigate(Routes.EVENT_DETAIL(record.entityId1))}
              title={t('duplicates.section.openEvent')}
              className="flex items-center justify-center rounded-full p-1.5 text-dn-text-muted hover:bg-dn-surface hover:text-dn-text-main transition-colors"
            >
              <Icon name="open_in_new" className="text-base" />
            </button>
            <button
              type="button"
              onClick={handleKeep2}
              disabled={resolve.isPending}
              title={t('duplicates.section.deleteOther')}
              className="flex items-center justify-center rounded-full p-1.5 text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
            >
              <Icon name="delete" className="text-base" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <EventCard event={fake2} disableLink />
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => navigate(Routes.EVENT_DETAIL(record.entityId2))}
              title={t('duplicates.section.openEvent')}
              className="flex items-center justify-center rounded-full p-1.5 text-dn-text-muted hover:bg-dn-surface hover:text-dn-text-main transition-colors"
            >
              <Icon name="open_in_new" className="text-base" />
            </button>
            <button
              type="button"
              onClick={handleKeep1}
              disabled={resolve.isPending}
              title={t('duplicates.section.deleteOther')}
              className="flex items-center justify-center rounded-full p-1.5 text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
            >
              <Icon name="delete" className="text-base" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventDuplicatesPage() {
  const { t } = useTranslation();
  const { data: records, isLoading } = useDuplicates('FINANCE_EVENT', 'PENDING');

  return (
    <div className="space-y-4">
      <PageHeader title={t('duplicates.list.title')} back={Routes.EVENTS} />

      <section className="px-5 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : !records?.length ? (
          <EmptyState title={t('duplicates.list.empty')} />
        ) : (
          records.map((record, i) => (
            <DuplicatePairCard
              key={record.id}
              record={record as DuplicateEventRecord}
              index={i + 1}
            />
          ))
        )}
      </section>
    </div>
  );
}
