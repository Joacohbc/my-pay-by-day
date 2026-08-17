import { useMemo } from 'react';
import type { FinanceEvent, PaymentPlan } from '@/models';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';

/**
 * Resolves the PaymentPlan behind each row's `paymentPlanId`, keyed by whatever id the list uses for
 * that row (event id for confirmed events, draft id for drafts). The backend already reports the
 * membership, so this only turns that id into the plan the UI needs for a name and a colour.
 */
export function usePlanByRowId(
  rows: FinanceEvent[],
  getRowId: (row: FinanceEvent) => number
): Map<number, PaymentPlan> {
  const { data: plans = [] } = usePaymentPlans();

  return useMemo(() => {
    const planById = new Map(plans.map((plan) => [plan.id, plan] as const));
    const planByRowId = new Map<number, PaymentPlan>();

    for (const row of rows) {
      const plan = row.paymentPlanId ? planById.get(row.paymentPlanId) : undefined;
      if (plan) planByRowId.set(getRowId(row), plan);
    }

    return planByRowId;
  }, [rows, plans, getRowId]);
}
