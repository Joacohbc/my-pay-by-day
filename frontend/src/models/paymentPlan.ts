import type { Category, FinanceNode, Tag } from '@/models';

export type PaymentPlanType = 'RECURRING' | 'INSTALLMENT' | 'CUSTOM';
export type PaymentPlanStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type PaymentPlanItemStatus = 'PENDING' | 'DRAFTED' | 'PAID' | 'SKIPPED' | 'OVERDUE';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface PaymentPlanItem {
  id: number;
  paymentPlanId: number;
  installmentNumber: number;
  expectedDate: string;
  expectedAmount?: number;
  eventId?: number;
  draftId?: number;
  itemStatus: PaymentPlanItemStatus;
}

export interface PaymentPlan {
  id: number;
  name: string;
  description?: string;
  planType: PaymentPlanType;
  status: PaymentPlanStatus;
  totalInstallments?: number;
  totalAmount?: number;
  installmentAmount?: number;
  frequency: RecurrenceFrequency;
  startDate: string;
  nextDueDate?: string;
  isAutomated: boolean;
  autoCreateDraft: boolean;
  originNode?: FinanceNode;
  destinationNode?: FinanceNode;
  category?: Category;
  tags?: Tag[];
  items?: PaymentPlanItem[];
  completedInstallments: number;
  paidAmount: number;
  remainingAmount: number;
}

export interface CreatePaymentPlanDto {
  name: string;
  description?: string;
  planType: PaymentPlanType;
  status?: PaymentPlanStatus;
  totalInstallments?: number;
  totalAmount?: number;
  installmentAmount?: number;
  frequency: RecurrenceFrequency;
  startDate: string;
  isAutomated?: boolean;
  autoCreateDraft?: boolean;
  originNodeId?: number;
  destinationNodeId?: number;
  categoryId?: number;
  tagIds?: number[];
  generateItems?: boolean;
}

export interface CreatePaymentPlanItemDto {
  installmentNumber?: number;
  expectedDate: string;
  expectedAmount?: number;
  itemStatus?: PaymentPlanItemStatus;
  eventId?: number;
  draftId?: number;
}
