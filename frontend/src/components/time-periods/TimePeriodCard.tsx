import { Link } from 'react-router-dom';
import { useTimePeriodBalance } from '@/hooks/useTimePeriods';
import { useDefaultTimePeriod } from '@/hooks/useDefaultTimePeriod';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import type { TimePeriod } from '@/models';

interface TimePeriodCardProps {
  period: TimePeriod;
  onEdit: (tp: TimePeriod) => void;
  onDelete: (tp: TimePeriod) => void;
}

/** Skeleton for the async income/outbound row */
function BalanceSkeleton() {
  return (
    <div className="flex items-center gap-3 mt-2 animate-pulse">
      <div className="h-3 w-16 rounded-full bg-dn-surface-low" />
      <div className="h-3 w-16 rounded-full bg-dn-surface-low" />
    </div>
  );
}

const formatDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function TimePeriodCard({ period: tp, onEdit, onDelete }: TimePeriodCardProps) {
  const { defaultId, setDefaultId } = useDefaultTimePeriod();
  const { data: balance, isLoading: balanceLoading } = useTimePeriodBalance(tp.id);

  const isDefault = defaultId === tp.id;
  const income = balance?.income ?? 0;
  const outbound = balance?.outbound ?? 0;
  const net = income - outbound;

  return (
    <Card className={isDefault ? 'ring-2 ring-dn-primary/30' : ''}>
      <div className="flex items-start gap-3">
        {/* Left icon */}
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 ${
            isDefault ? 'bg-dn-primary/20 text-dn-primary' : 'bg-dn-surface-low text-dn-text-muted'
          }`}
        >
          <Icon name="calendar_month" className="text-[18px]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + badges + star */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <p className="text-base font-semibold text-dn-text-main truncate">{tp.name}</p>
              {isDefault && <Badge variant="indigo">Home</Badge>}
              {tp.category && <Badge variant="gray">{tp.category.name}</Badge>}
            </div>
            {/* Star */}
            <button
              onClick={() => setDefaultId(isDefault ? null : tp.id)}
              title={isDefault ? 'Remove as default' : 'Set as Home default'}
              className={`p-1 rounded-full transition-colors shrink-0 ${
                isDefault
                  ? 'text-dn-warning hover:bg-dn-warning/10'
                  : 'text-dn-text-muted hover:text-dn-warning hover:bg-dn-warning/10'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isDefault ? 'star' : 'star_border'}
              </span>
            </button>
          </div>

          {/* Date range */}
          <p className="text-sm text-dn-text-muted mt-1">
            {formatDate(tp.startDate)} – {formatDate(tp.endDate)}
          </p>

          {/* Async balance row */}
          {balanceLoading ? (
            <BalanceSkeleton />
          ) : (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-sm text-dn-success">
                <span className="material-symbols-outlined text-sm">arrow_downward</span>
                {fmt(income)}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-dn-error">
                <span className="material-symbols-outlined text-sm">arrow_upward</span>
                {fmt(outbound)}
              </span>
              <span className={`text-sm font-semibold font-mono ${net >= 0 ? 'text-dn-success' : 'text-dn-error'}`}>
                {net >= 0 ? '+' : ''}{fmt(net)}
              </span>
            </div>
          )}

          {/* Budget / savings */}
          {(tp.budgetedAmount != null || tp.savingsPercentageGoal != null) && (
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              {tp.budgetedAmount != null && (
                <p className="text-xs text-dn-text-muted">
                  Budget: <span className="text-dn-text-main">
                    {tp.budgetedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </span>
                </p>
              )}
              {tp.savingsPercentageGoal != null && (
                <p className="text-xs text-dn-text-muted">
                  Savings: <span className="text-dn-text-main">{tp.savingsPercentageGoal}%</span>
                </p>
              )}
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-1.5 mt-2 -ml-1">
            <Link
              to={`/periods/${tp.id}`}
              className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
              title="View balance"
            >
              <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            </Link>
            <button
              onClick={() => onEdit(tp)}
              className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button
              onClick={() => onDelete(tp)}
              className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors"
              title="Delete"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
