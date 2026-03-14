import { useTranslation } from 'react-i18next';
import { useDynamicTimePeriodBalance } from '@/hooks/useTimePeriods';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatDateFromParts } from '@/lib/format';
import { NewEventFab } from '@/components/time-periods/NewEventFab';
import { PeriodBalanceSummary } from '@/components/time-periods/PeriodBalanceSummary';
import { PeriodRecentActivity } from '@/components/time-periods/PeriodRecentActivity';
import type { FinanceEvent } from '@/models';

interface DynamicTimePeriodDashboardProps {
  startDate: string;
  endDate: string;
  onNewEvent?: () => void;
}

export function DynamicTimePeriodDashboard({
  startDate,
  endDate,
  onNewEvent,
}: DynamicTimePeriodDashboardProps) {
  const { t } = useTranslation();
  const { data: balance, isLoading, error } = useDynamicTimePeriodBalance(startDate, endDate);

  if (isLoading) return <FullPageSpinner />;
  if (error || !balance) return <ErrorState message={error ? String(error) : t('errors.couldNotLoadPeriod')} />;

  const { income, outbound, events } = balance;
  const netBalance = (income ?? 0) - (outbound ?? 0);

  const recentEvents: FinanceEvent[] = [...(events ?? [])]
    .sort((a, b) => (b.transactionDate ?? '').localeCompare(a.transactionDate ?? ''))
    .slice(0, 8);

  const dateLabel = `${formatDateFromParts(startDate)} – ${formatDateFromParts(endDate)}`;

  return (
    <div className="space-y-6 px-5 pt-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold text-dn-text-main tracking-tight">{t('periods.dynamic.title', 'Dynamic Period')}</h1>
        </div>
        <p className="text-xs text-dn-text-muted mt-0.5">{dateLabel}</p>
      </div>

      <PeriodBalanceSummary
        netBalance={netBalance}
        income={income ?? 0}
        outbound={outbound ?? 0}
        eventCount={events.length}
      />

      <PeriodRecentActivity recentEvents={recentEvents} />

      <NewEventFab onNewEvent={onNewEvent} />

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
