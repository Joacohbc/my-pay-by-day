import { useTranslation } from 'react-i18next';
import { useTimePeriodBalance } from '@/hooks/useTimePeriods';
import { BudgetsItemList } from '@/components/time-periods/BudgetsItemList';
import { Card } from '@/components/ui/Card';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { NewEventFab } from '@/components/time-periods/NewEventFab';
import { PeriodBalanceSummary } from '@/components/time-periods/PeriodBalanceSummary';
import { PeriodRecentActivity } from '@/components/time-periods/PeriodRecentActivity';
import { formatCurrency, formatDateFromParts, getLocalizedNow } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { FinanceEvent, TimePeriod } from '@/models';

interface TimePeriodDashboardProps {
  timePeriodId: number;
  /** Optional callback to navigate away (e.g. to periods list) */
  onChangePeriod?: () => void;
  /** Whether to show the greeting header (Home page only) */
  showGreeting?: boolean;
  /** Optional callback for the New Event FAB (opens template picker) */
  onNewEvent?: () => void;
}

export function TimePeriodDashboard({
  timePeriodId,
  onChangePeriod,
  showGreeting = false,
  onNewEvent,
}: TimePeriodDashboardProps) {
  const { t } = useTranslation();
  const { data: balance, isLoading, error } = useTimePeriodBalance(timePeriodId);

  if (isLoading) return <FullPageSpinner />;
  if (error || !balance) return <ErrorState message={error ? String(error) : t('errors.couldNotLoadPeriod')} />;

  const { timePeriod, income, outbound, events } = balance;
  const netBalance = (income ?? 0) - (outbound ?? 0);

  const recentEvents: FinanceEvent[] = [...(events ?? [])]
    .sort((a, b) => (b.transactionDate ?? '').localeCompare(a.transactionDate ?? ''))
    .slice(0, 8);

  const dateLabel = formatPeriodLabel(timePeriod);

  const now = getLocalizedNow();
  const greeting =
    now.getHours() < 12 ? t('greeting.morning') : now.getHours() < 18 ? t('greeting.afternoon') : t('greeting.evening');

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
              {t('periods.change')}
            </button>
          )}
        </div>
        <p className="text-xs text-dn-text-muted mt-0.5">{dateLabel}</p>
      </div>

      <PeriodBalanceSummary
        netBalance={netBalance}
        income={income ?? 0}
        outbound={outbound ?? 0}
        eventCount={events.length}
      />

      {/* Savings goal */}
      {timePeriod.savingsPercentageGoal != null && income > 0 && (
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-dn-primary/10 text-dn-primary shrink-0 mt-0.5">
              <Icon name="savings" className="text-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dn-text-muted uppercase tracking-wider">{t('periods.savingsGoalLabel')}</p>
              <p className="text-sm font-medium text-dn-text-main mt-0.5">
                {timePeriod.savingsPercentageGoal}% ={' '}
                <span className="text-dn-primary">
                  {formatCurrency((income * timePeriod.savingsPercentageGoal) / 100)}
                </span>
              </p>
              <p className="text-[11px] text-dn-text-muted mt-1">
                {t('periods.actualSavings')}: {formatCurrency(netBalance)} (
                {income > 0 ? Math.round((netBalance / income) * 100) : 0}%)
              </p>
            </div>
          </div>
        </Card>
      )}

      { timePeriod.budgetLimit != null &&
      <Card className="space-y-4">
        <p className="text-sm text-dn-text-muted uppercase tracking-wider mb-3">
          {t('periods.budgetLabel', 'Budgets')}
        </p>

        <BudgetsItemList
          name={t('periods.budgetTotalLabel')}
          spentAmount={outbound}
          budgetedAmount={timePeriod.budgetLimit}
        /> 
        
        <div className="border-t border-white/5" />
        
        {balance.categoryBudgets.map((b, i) => (
          <>
            <BudgetsItemList
              key={b.category.id}
              name={b.category.name}
              spentAmount={b.spentAmount}
              budgetedAmount={b.budgetedAmount}
            />
            { i < balance.categoryBudgets.length - 1 && <div className="border-t border-white/5" /> }
          </>
        ))}
      </Card>}

      <PeriodRecentActivity recentEvents={recentEvents} />

      <NewEventFab onNewEvent={onNewEvent} />

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatPeriodLabel(tp: TimePeriod): string {
  return `${formatDateFromParts(tp.startDate)} – ${formatDateFromParts(tp.endDate)}`;
}
