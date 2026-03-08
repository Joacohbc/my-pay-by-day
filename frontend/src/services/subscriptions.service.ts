import type { Subscription, CreateSubscriptionDto } from '@/models';
import { api } from '@/services/api';

export const subscriptionsService = {
  getAll: () => api.get<Subscription[]>('/subscriptions'),
  getById: (id: number) => api.get<Subscription>(`/subscriptions/${id}`),
  create: (dto: CreateSubscriptionDto) =>
    api.post<Subscription>('/subscriptions', dto),
  update: (id: number, dto: Partial<CreateSubscriptionDto>) =>
    api.put<Subscription>(`/subscriptions/${id}`, dto),
  delete: (id: number) => api.delete(`/subscriptions/${id}`),
};
