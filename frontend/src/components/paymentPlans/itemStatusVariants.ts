import type { PaymentPlanItemStatus } from '@/models';

export const itemStatusVariants: Record<PaymentPlanItemStatus, 'income' | 'expense' | 'indigo' | 'gray'> = {
  PAID: 'income',
  OVERDUE: 'expense',
  DRAFTED: 'indigo',
  PENDING: 'gray',
  SKIPPED: 'gray',
};
