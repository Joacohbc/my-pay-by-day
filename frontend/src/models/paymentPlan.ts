import type { Category, RecurrenceFrequency, Tag, Template } from '@/models';

export type PaymentPlanType = 'RECURRING' | 'INSTALLMENT' | 'CUSTOM' | 'GROUP';
export type PaymentPlanStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type PaymentPlanItemStatus = 'PENDING' | 'DRAFTED' | 'PAID' | 'SKIPPED' | 'OVERDUE';

export interface PaymentPlanItem {
  id: number;
  paymentPlanId: number;
  installmentNumber: number;
  expectedDate: string;
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
  frequency?: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  /** Last date the plan covers, derived from the cuota count when no end date was given. */
  scheduleEndDate?: string;
  nextDueDate?: string;
  isAutomated: boolean;
  autoCreateDraft: boolean;
  /** Supplies the origin and destination nodes of every event this plan generates. */
  template?: Template;
  category?: Category;
  tags?: Tag[];
  items?: PaymentPlanItem[];
  completedInstallments: number;
  paidAmount: number;
  remainingAmount: number;
  /** ISO 4217 code denominating every amount on this plan. */
  currency?: string;
}

export interface CreatePaymentPlanDto {
  name: string;
  description?: string;
  planType: PaymentPlanType;
  status?: PaymentPlanStatus;
  totalInstallments?: number;
  totalAmount?: number;
  installmentAmount?: number;
  frequency?: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  isAutomated?: boolean;
  autoCreateDraft?: boolean;
  templateId?: number;
  categoryId?: number;
  tagIds?: number[];
  generateItems?: boolean;
  /** GROUP plans only: existing finance events to link as already-settled members of the group. */
  eventIds?: number[];
  /** GROUP plans only: existing drafts to link as pending members of the group. */
  draftIds?: number[];
}

/**
 * Links existing events/drafts to a plan. The backend claims one entry per member inside a single
 * transaction, which is why a batch belongs in one call: resolving the free entries client-side
 * gives every member the same stale snapshot, so they overwrite each other.
 */
export interface AttachToPaymentPlanDto {
  eventIds?: number[];
  draftIds?: number[];
  /** The entry to fill. Only valid with a single member; omitted means the first free one. */
  itemId?: number;
}

export interface CreatePaymentPlanItemDto {
  installmentNumber?: number;
  expectedDate: string;
  itemStatus?: PaymentPlanItemStatus;
  eventId?: number;
  draftId?: number;
}
