import { Icon } from '@/components/ui/Icon';
import { formatCurrency } from '@/lib/format';

interface BudgetsItemListProps {
  name: string;
  spentAmount: number;
  budgetedAmount: number;
}

interface BudgetStatus {
  usedPct: number;
  isOver: boolean;
  isWarning: boolean;
  statusIcon: string;
  statusColor: string;
  barColor: string;
}

function calculateBudgetStatus(spent: number, budgeted: number): BudgetStatus {
  const usedPct = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : 0;
  const isOver = spent > budgeted;
  const isWarning = usedPct >= 80 && !isOver;

  return {
    usedPct,
    isOver,
    isWarning,
    statusIcon: isOver ? 'cancel' : isWarning ? 'warning' : 'check_circle',
    statusColor: isOver ? 'text-dn-error' : isWarning ? 'text-dn-warning' : 'text-dn-success',
    barColor: isOver ? 'bg-dn-error' : isWarning ? 'bg-dn-warning' : 'bg-dn-success',
  };
}

export function BudgetsItemList({ name, spentAmount, budgetedAmount }: BudgetsItemListProps) {
  const { usedPct, statusIcon, statusColor, barColor } = calculateBudgetStatus(
    spentAmount,
    budgetedAmount
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name={statusIcon} className={`text-[24px] ${statusColor}`} />
          <p className="text-base font-medium text-dn-text-main">{name}</p>
        </div>
        <p className="text-sm text-dn-text-muted">
          {formatCurrency(spentAmount)} / {formatCurrency(budgetedAmount)}
        </p>
      </div>
      <div className="h-2 rounded-full bg-dn-surface-low overflow-hidden ml-8">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${usedPct}%` }}
        />
      </div>
    </div>
  );
}
