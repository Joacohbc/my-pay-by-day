import type { PaymentPlanItemStatus, PaymentPlanType, RecurrenceFrequency } from '@/models';

/** INSTANT has no cadence to schedule along, so it can never drive a cuota or subscription plan. */
export const SCHEDULABLE_FREQUENCIES = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
] as const satisfies readonly RecurrenceFrequency[];

export const itemStatusVariants: Record<PaymentPlanItemStatus, 'income' | 'expense' | 'indigo' | 'gray'> = {
  PAID: 'income',
  OVERDUE: 'expense',
  DRAFTED: 'indigo',
  PENDING: 'gray',
  SKIPPED: 'gray',
};

export const planTypeIcons: Record<PaymentPlanType, string> = {
  INSTALLMENT: 'credit_card',
  RECURRING: 'sync',
  CUSTOM: 'tune',
  GROUP: 'workspaces',
};

export function isGroupPlan(planType: PaymentPlanType): boolean {
  return planType === 'GROUP';
}

/** These kinds have no cadence of their own: every item in them is placed by the user. */
export function isUserComposedPlan(planType: PaymentPlanType): boolean {
  return planType === 'CUSTOM' || planType === 'GROUP';
}

export function itemNumberKey(planType: PaymentPlanType): string {
  return isGroupPlan(planType) ? 'paymentPlans.groupItemNumber' : 'paymentPlans.itemNumber';
}

export function itemModalTitleKey(planType: PaymentPlanType, isEditing: boolean): string {
  if (isGroupPlan(planType)) {
    return isEditing ? 'paymentPlans.groupItemEditTitle' : 'paymentPlans.groupItemNewTitle';
  }
  return isEditing ? 'paymentPlans.itemEditTitle' : 'paymentPlans.itemNewTitle';
}

export type SchedulableFrequency = (typeof SCHEDULABLE_FREQUENCIES)[number];
