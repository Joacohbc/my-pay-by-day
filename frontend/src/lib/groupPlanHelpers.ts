import type { CreatePaymentPlanItemDto, FinanceEvent, PaymentPlan } from '@/models';

export function nextGroupInstallmentNumber(plan: PaymentPlan): number {
  return (plan.items ?? []).reduce((max, item) => Math.max(max, item.installmentNumber), 0) + 1;
}

export function toDateOnly(dateTime: string): string {
  return dateTime.slice(0, 10);
}

type AddGroupPlanItem = (variables: { planId: number; dto: CreatePaymentPlanItemDto }) => Promise<unknown>;

/**
 * Adds every event to the plan one at a time: each entry takes the installment number after the
 * previous one, so they cannot be issued in parallel. Rejects on the first failure with the events
 * after it untouched, leaving the caller free to keep the selection alive for a retry.
 */
export async function addEventsToGroupPlan(
  plan: PaymentPlan,
  events: FinanceEvent[],
  addItem: AddGroupPlanItem
): Promise<void> {
  let installmentNumber = nextGroupInstallmentNumber(plan);

  for (const event of events) {
    await addItem({
      planId: plan.id,
      dto: {
        installmentNumber: installmentNumber++,
        expectedDate: toDateOnly(event.transactionDate),
        itemStatus: 'PAID',
        eventId: event.id,
      },
    });
  }
}
