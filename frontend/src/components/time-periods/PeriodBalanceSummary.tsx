import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency, formatCurrencyShort } from '@/lib/format';

interface PeriodBalanceSummaryProps {
  netBalance: number;
  income: number;
  outbound: number;
  eventCount: number;
}

export function PeriodBalanceSummary({
  netBalance,
  income,
  outbound,
  eventCount,
}: PeriodBalanceSummaryProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const displayCurrency = (amount: number) =>
    isExpanded ? formatCurrency(amount) : formatCurrencyShort(amount);

  return (
    <>
      <Card className="relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-dn-text-muted uppercase tracking-wider">{t('periods.netBalance')}</p>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-dn-text-muted hover:text-dn-text-main transition-colors flex items-center justify-center p-1 rounded-full bg-dn-panel-bg"
            title={isExpanded ? t('common.collapse', 'Collapse') : t('common.expand', 'Expand')}
          >
            <Icon name={isExpanded ? 'visibility_off' : 'visibility'} className="text-sm" />
          </button>
        </div>
        <p
          className={`text-4xl font-mono font-bold tracking-tight break-all ${
            netBalance >= 0 ? 'text-dn-success' : 'text-dn-error'
          }`}
        >
          {displayCurrency(netBalance)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-medium ${
              netBalance >= 0 ? 'bg-dn-success/10 text-dn-success' : 'bg-dn-error/10 text-dn-error'
            }`}
          >
            <Icon name={netBalance >= 0 ? 'trending_up' : 'trending_down'} className="text-sm" />
            {t(eventCount !== 1 ? 'periods.eventCount_plural' : 'periods.eventCount', { count: eventCount })}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-dn-success/10 text-dn-success mb-2">
            <Icon name="trending_up" className="text-[24px]" />
          </div>
          <p className="text-xs text-dn-text-muted mb-0.5">{t('events.income')}</p>
          <p className="text-base font-mono font-semibold text-dn-success break-all">{displayCurrency(income)}</p>
        </Card>
        <Card>
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-dn-error/10 text-dn-error mb-2">
            <Icon name="trending_down" className="text-[24px]" />
          </div>
          <p className="text-[11px] text-dn-text-muted mb-0.5">{t('events.expenses')}</p>
          <p className="text-base font-mono font-semibold text-dn-text-main break-all">{displayCurrency(outbound)}</p>
        </Card>
      </div>
    </>
  );
}