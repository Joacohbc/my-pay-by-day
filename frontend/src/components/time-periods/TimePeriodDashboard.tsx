import { Link } from 'react-router-dom';
import { useTimePeriodBalance } from '@/hooks/useTimePeriods';
import { EventCard } from '@/components/events/EventCard';
import { Card } from '@/components/ui/Card';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { FinanceEvent, TimePeriod } from '@/models';

interface TimePeriodDashboardProps {
  timePeriodId: number;
  /** Optional callback to navigate away (e.g. to periods list) */
  onChangePeriod?: () => void;
  /** Whether to show the greeting header (Home page only) */
  showGreeting?: boolean;
}

export function TimePeriodDashboard({
  timePeriodId,
  onChangePeriod,
  showGreeting = false,
}: TimePeriodDashboardProps) {
  const { data: balance, isLoading, error } = useTimePeriodBalance(timePeriodId);

  if (isLoading) return <FullPageSpinner />;
  if (error || !balance) return <ErrorState message={error ? String(error) : 'Could not load period data'} />;

  const { timePeriod, income, outbound, events } = balance;
  const netBalance = (income ?? 0) - (outbound ?? 0);

  const recentEvents: FinanceEvent[] = [...(events ?? [])]
    .sort((a, b) => (b.transactionDate ?? '').localeCompare(a.transactionDate ?? ''))
    .slice(0, 8);

  const dateLabel = formatPeriodLabel(timePeriod);
  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const budgetUsedPct =
    timePeriod.budgetedAmount && timePeriod.budgetedAmount > 0
      ? Math.min(100, Math.round((outbound / timePeriod.budgetedAmount) * 100))
      : null;

  return (
    <div className="space-y-6 px-5 pt-6">
      {/* Header */}
      <div>
        {showGreeting && <p className="text-sm text-dn-text-muted">{greeting}</p>}
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold text-dn-text-main tracking-tight">{timePeriod.name}</h1>
          {onChangePeriod && (
            <button
              onClick={onChangePeriod}
              className="shrink-0 flex items-center gap-1 text-xs text-dn-primary px-2 py-1 rounded-pill bg-dn-primary/10 hover:bg-dn-primary/20 transition-colors mt-1"
            >
              <Icon name="swap_horiz" className="text-sm" />
              Change
            </button>
          )}
        </div>
        <p className="text-xs text-dn-text-muted mt-0.5">{dateLabel}</p>
      </div>

      {/* Balance Card */}
      <Card className="relative overflow-hidden">
        <p className="text-xs text-dn-text-muted uppercase tracking-wider mb-1">Net Balance</p>
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
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>

      {/* Income / Expense Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-success/10 text-dn-success mb-3">
            <Icon name="trending_up" />
          </div>
          <p className="text-xs text-dn-text-muted mb-0.5">Income</p>
          <p className="text-lg font-mono font-semibold text-dn-success">{formatCurrency(income ?? 0)}</p>
        </Card>
        <Card>
          <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-error/10 text-dn-error mb-3">
            <Icon name="trending_down" />
          </div>
          <p className="text-xs text-dn-text-muted mb-0.5">Expenses</p>
          <p className="text-lg font-mono font-semibold text-dn-text-main">{formatCurrency(outbound ?? 0)}</p>
        </Card>
      </div>

      {/* Budget progress */}
      {timePeriod.budgetedAmount != null && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-dn-text-muted uppercase tracking-wider">Budget</p>
            <p className="text-xs text-dn-text-muted">
              {formatCurrency(outbound)} / {formatCurrency(timePeriod.budgetedAmount)}
            </p>
          </div>
          <div className="h-2 rounded-full bg-dn-surface-low overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (budgetUsedPct ?? 0) >= 100 ? 'bg-dn-error' : (budgetUsedPct ?? 0) >= 80 ? 'bg-dn-warning' : 'bg-dn-success'
              }`}
              style={{ width: `${budgetUsedPct ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-dn-text-muted mt-1">{budgetUsedPct}% used</p>
        </Card>
      )}

      {/* Savings goal */}
      {timePeriod.savingsPercentageGoal != null && income > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-primary/10 text-dn-primary shrink-0">
              <Icon name="savings" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dn-text-muted uppercase tracking-wider">Savings Goal</p>
              <p className="text-sm font-medium text-dn-text-main">
                {timePeriod.savingsPercentageGoal}% ={' '}
                <span className="text-dn-primary">
                  {formatCurrency((income * timePeriod.savingsPercentageGoal) / 100)}
                </span>
              </p>
              <p className="text-xs text-dn-text-muted">
                Actual savings: {formatCurrency(netBalance)} (
                {income > 0 ? Math.round((netBalance / income) * 100) : 0}%)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-dn-text-muted uppercase tracking-wider">Activity</h2>
          <Link to="/events" className="text-xs text-dn-primary flex items-center gap-0.5">
            View all
            <Icon name="chevron_right" className="text-sm" />
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <Card>
            <p className="text-sm text-dn-text-muted text-center py-4">
              No events in this period yet.
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
        <Link to="/events/new">
          <Button size="lg" className="rounded-pill shadow-lg shadow-dn-primary/20 gap-2">
            <Icon name="add" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatPeriodLabel(tp: TimePeriod): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  return `${fmt(tp.startDate)} – ${fmt(tp.endDate)}`;
}
