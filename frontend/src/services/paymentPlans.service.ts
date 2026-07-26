import type { CreatePaymentPlanDto, CreatePaymentPlanItemDto, PaymentPlan, PaymentPlanItem } from '@/models';
import { api } from '@/services/api';

export const paymentPlansService = {
  listAll: (): Promise<PaymentPlan[]> => api.get<PaymentPlan[]>('/payment-plans'),
  getById: (id: number): Promise<PaymentPlan> => api.get<PaymentPlan>(`/payment-plans/${id}`),
  create: (data: CreatePaymentPlanDto): Promise<PaymentPlan> => api.post<PaymentPlan>('/payment-plans', data),
  update: (id: number, data: CreatePaymentPlanDto): Promise<PaymentPlan> => api.put<PaymentPlan>(`/payment-plans/${id}`, data),
  cancel: (id: number): Promise<PaymentPlan> => api.post<PaymentPlan>(`/payment-plans/${id}/cancel`),

  listItems: (planId: number): Promise<PaymentPlanItem[]> =>
    api.get<PaymentPlanItem[]>(`/payment-plans/${planId}/items`),
  getItemById: (planId: number, itemId: number): Promise<PaymentPlanItem> =>
    api.get<PaymentPlanItem>(`/payment-plans/${planId}/items/${itemId}`),
  createItem: (planId: number, data: CreatePaymentPlanItemDto): Promise<PaymentPlanItem> =>
    api.post<PaymentPlanItem>(`/payment-plans/${planId}/items`, data),
  updateItem: (planId: number, itemId: number, data: CreatePaymentPlanItemDto): Promise<PaymentPlanItem> =>
    api.put<PaymentPlanItem>(`/payment-plans/${planId}/items/${itemId}`, data),
  deleteItem: (planId: number, itemId: number): Promise<void> =>
    api.delete<void>(`/payment-plans/${planId}/items/${itemId}`),
};
