import type { TimePeriod } from '@/models';

export type BudgetLimitMode = 'auto' | 'fixed' | 'none';

/**
 * Detects the budget limit mode based on the stored budgetLimit and the sum of category budgets.
 */
export function getBudgetLimitMode(tp: TimePeriod): BudgetLimitMode {
  const tpBudgetSum = (tp.budgets || []).reduce((acc, b) => acc + (b.budgetedAmount || 0), 0);
  const tpBudgetLimit = tp.budgetLimit;

  // Mode Auto: limit is null (and sum is 0) OR limit matches the sum of category budgets.
  const isAuto = tpBudgetLimit == null
    ? tpBudgetSum === 0
    : Math.abs(tpBudgetLimit - tpBudgetSum) < 0.0001;

  if (isAuto) return 'auto';
  
  // Mode None: limit is explicitly null but we have category budgets totaling > 0.
  if (tpBudgetLimit == null) return 'none';
  
  // Mode Fixed: limit is set to a specific value that doesn't match the sum.
  return 'fixed';
}
