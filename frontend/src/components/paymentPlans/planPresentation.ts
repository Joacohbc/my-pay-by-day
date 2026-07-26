import type { PaymentPlanItemStatus, PaymentPlanType } from '@/models';

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
