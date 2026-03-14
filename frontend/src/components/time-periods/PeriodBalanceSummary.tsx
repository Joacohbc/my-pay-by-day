import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency } from '@/lib/format';

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

  return (
    <>
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
            {t(eventCount !== 1 ? 'periods.eventCount_plural' : 'periods.eventCount', { count: eventCount })}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-dn-success/10 text-dn-success mb-2">
            <Icon name="trending_up" className="text-[18px]" />
          </div>
          <p className="text-[11px] text-dn-text-muted mb-0.5">{t('events.income')}</p>
          <p className="text-base font-mono font-semibold text-dn-success">{formatCurrency(income)}</p>
        </Card>
        <Card>
          <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-dn-error/10 text-dn-error mb-2">
            <Icon name="trending_down" className="text-[18px]" />
          </div>
          <p className="text-[11px] text-dn-text-muted mb-0.5">{t('events.expenses')}</p>
          <p className="text-base font-mono font-semibold text-dn-text-main">{formatCurrency(outbound)}</p>
        </Card>
      </div>
    </>
  );
}