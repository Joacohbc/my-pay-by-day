import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDynamicTimePeriodBalance } from '@/hooks/useTimePeriods';
import { EventCard } from '@/components/events/EventCard';
import { Card } from '@/components/ui/Card';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateFromParts } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
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

      {/* Balance Card */}
      <Card className="relative overflow-hidden">
        <p className="text-xs text-dn-text-muted uppercase tracking-wider mb-1">{t('periods.netBalance')}</p>
        <p
          className={`text-4xl font-mono font-bold tracking-tight ${
            netBalance >= 0 ? 'text-dn-success' : 'text-dn-error'
          }`}
        >
          {formatCurrency(netBalance)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-medium ${
              netBalance >= 0 ? 'bg-dn-success/10 text-dn-success' : 'bg-dn-error/10 text-dn-error'
            }`}
          >
            <Icon name={netBalance >= 0 ? 'trending_up' : 'trending_down'} className="text-sm" />
            {t(events.length !== 1 ? 'periods.eventCount_plural' : 'periods.eventCount', { count: events.length })}
          </span>
        </div>
      </Card>

      {/* Income / Expense Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-success/10 text-dn-success mb-3">
            <Icon name="trending_up" />
          </div>
          <p className="text-xs text-dn-text-muted mb-0.5">{t('events.income')}</p>
          <p className="text-lg font-mono font-semibold text-dn-success">{formatCurrency(income ?? 0)}</p>
        </Card>
        <Card>
          <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-error/10 text-dn-error mb-3">
            <Icon name="trending_down" />
          </div>
          <p className="text-xs text-dn-text-muted mb-0.5">{t('events.expenses')}</p>
          <p className="text-lg font-mono font-semibold text-dn-text-main">{formatCurrency(outbound ?? 0)}</p>
        </Card>
      </div>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-dn-text-muted uppercase tracking-wider">{t('periods.activity')}</h2>
          <Link to="/events" className="text-xs text-dn-primary flex items-center gap-0.5">
            {t('periods.viewAll')}
            <Icon name="chevron_right" className="text-sm" />
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <Card>
            <p className="text-sm text-dn-text-muted text-center py-4">
              {t('periods.noEventsInPeriod')}
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-white/5">
            {recentEvents.map((event) => (
              <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                <EventCard event={event} />
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* FAB */}
      <div className="fixed bottom-24 right-5 z-30">
        {onNewEvent ? (
          <Button size="lg" className="rounded-pill shadow-lg shadow-dn-primary/20 gap-2" onClick={onNewEvent}>
            <Icon name="add" />
            {t('dashboard.newEvent')}
          </Button>
        ) : (
          <Link to="/events/new">
            <Button size="lg" className="rounded-pill shadow-lg shadow-dn-primary/20 gap-2">
              <Icon name="add" />
              {t('dashboard.newEvent')}
            </Button>
          </Link>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
