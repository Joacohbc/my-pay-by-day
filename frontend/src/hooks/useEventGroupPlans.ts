import { useMemo } from 'react';
import type { PaymentPlan } from '@/models';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';

/** Maps every event that belongs to an active GROUP plan back to that plan, so a list of events can show its grouping without each row querying the plans list itself. */
export function useEventGroupPlans() {
  const { data: plans = [] } = usePaymentPlans();

  const planByEventId = useMemo(() => {
    const map = new Map<number, PaymentPlan>();
    for (const plan of plans) {
      if (plan.planType !== 'GROUP') continue;
      for (const item of plan.items ?? []) {
        if (item.eventId != null) {
          map.set(item.eventId, plan);
        }
      }
    }
    return map;
  }, [plans]);

  return { planByEventId };
}
