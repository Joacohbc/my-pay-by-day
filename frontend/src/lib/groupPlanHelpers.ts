import type { PaymentPlan } from '@/models';

export function nextGroupInstallmentNumber(plan: PaymentPlan): number {
  return (plan.items ?? []).reduce((max, item) => Math.max(max, item.installmentNumber), 0) + 1;
}

export function toDateOnly(dateTime: string): string {
  return dateTime.slice(0, 10);
}
