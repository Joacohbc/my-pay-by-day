import type { Subscription, CreateSubscriptionDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export const subscriptionsService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<Subscription>>(`/subscriptions?page=${page}&size=${size}`),
  getById: (id: number) => api.get<Subscription>(`/subscriptions/${id}`),
  create: (dto: CreateSubscriptionDto) =>
    api.post<Subscription>('/subscriptions', dto),
  update: (id: number, dto: Partial<CreateSubscriptionDto>) =>
    api.patch<Subscription>(`/subscriptions/${id}`, dto),
  delete: (id: number) => api.delete(`/subscriptions/${id}`),
};
