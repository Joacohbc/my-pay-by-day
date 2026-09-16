import { useTranslation } from 'react-i18next';
import { useTimePeriodBalance } from '@/hooks/useTimePeriods';
import { BudgetsItemList } from '@/components/time-periods/BudgetsItemList';
import { Card } from '@/components/ui/Card';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { NewEventFab } from '@/components/time-periods/NewEventFab';
import { PeriodBalanceSummary } from '@/components/time-periods/PeriodBalanceSummary';
import { PeriodRecentActivity } from '@/components/time-periods/PeriodRecentActivity';
import { formatMoney, formatServerDate, getCurrency, getLocalizedNow } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { CurrencyBalance, FinanceEvent, TimePeriod } from '@/models';

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

  const { timePeriod, events } = balance;
  const currencyBalances = balance.balances?.length ? balance.balances : [emptyBalance(timePeriod)];

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

      {currencyBalances.map((currencyBalance) => (
        <CurrencySection
          key={currencyBalance.currency}
          balance={currencyBalance}
          timePeriod={timePeriod}
          eventCount={events.length}
          showCurrencyHeading={currencyBalances.length > 1}
        />
      ))}

      <PeriodRecentActivity recentEvents={recentEvents} startDate={timePeriod.startDate} endDate={timePeriod.endDate} />

      <NewEventFab onNewEvent={onNewEvent} />

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Everything the dashboard reports about one currency.
 *
 * With no exchange rates there is no combined view to render, so the summary, the savings goal and
 * the budget bars are repeated per currency instead of being collapsed into totals that would mix
 * incomparable amounts. A single-currency period renders exactly one of these, as before.
 */
function CurrencySection({
  balance,
  timePeriod,
  eventCount,
  showCurrencyHeading,
}: {
  balance: CurrencyBalance;
  timePeriod: TimePeriod;
  eventCount: number;
  showCurrencyHeading: boolean;
}) {
  const { t } = useTranslation();
  const { currency, income, outbound, categoryBudgets } = balance;
  const netBalance = (income ?? 0) - (outbound ?? 0);
  const appliesPeriodLimit = timePeriod.budgetLimit != null && timePeriod.currency === currency;

  return (
    <div className="space-y-6">
      {showCurrencyHeading && (
        <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">{currency}</p>
      )}

      <PeriodBalanceSummary
        netBalance={netBalance}
        income={income ?? 0}
        outbound={outbound ?? 0}
        currency={currency}
        eventCount={eventCount}
      />

      {timePeriod.savingsPercentageGoal != null && income > 0 && (
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-dn-primary/10 text-dn-primary shrink-0 mt-0.5">
              <Icon name="savings" className="text-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dn-text-muted uppercase tracking-wider">{t('periods.savingsGoalLabel')}</p>
              <p className="text-sm font-medium text-dn-text-main mt-0.5 break-all">
                {timePeriod.savingsPercentageGoal}% ={' '}
                <span className="text-dn-primary">
                  {formatMoney((income * timePeriod.savingsPercentageGoal) / 100, currency)}
                </span>
              </p>
              <p className="text-[11px] text-dn-text-muted mt-1 break-all">
                {t('periods.actualSavings')}: {formatMoney(netBalance, currency)} (
                {income > 0 ? Math.round((netBalance / income) * 100) : 0}%)
              </p>
            </div>
          </div>
        </Card>
      )}

      {(appliesPeriodLimit || categoryBudgets.length > 0) && (
        <Card className="space-y-4">
          <p className="text-sm text-dn-text-muted uppercase tracking-wider mb-3">
            {t('periods.budgetLabel')}
          </p>

          {appliesPeriodLimit && (
            <BudgetsItemList
              name={t('periods.budgetTotalLabel')}
              spentAmount={outbound}
              budgetedAmount={timePeriod.budgetLimit!}
              currency={currency}
            />
          )}

          {categoryBudgets.map((b) => (
            <div key={b.category.id} className="space-y-4 mt-7">
              <BudgetsItemList
                name={b.category.name}
                spentAmount={b.spentAmount}
                budgetedAmount={b.budgetedAmount}
                currency={currency}
                category={b.category}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/** A period with no activity and no budgets still has a currency to show zeroes in. */
function emptyBalance(timePeriod: TimePeriod): CurrencyBalance {
  return {
    currency: timePeriod.currency ?? getCurrency(),
    income: 0,
    outbound: 0,
    categoryBudgets: [],
  };
}

function formatPeriodLabel(tp: TimePeriod): string {
  return `${formatServerDate(tp.startDate)} - ${formatServerDate(tp.endDate)}`;
}
