import type { TimePeriod, TimePeriodBalance, CreateTimePeriodDto } from '@/models';
import { api } from '@/services/api';

export const timePeriodsService = {
  getAll: () => api.get<TimePeriod[]>('/time-periods'),
  getById: (id: number) => api.get<TimePeriod>(`/time-periods/${id}`),
  getBalance: (id: number) => api.get<TimePeriodBalance>(`/time-periods/${id}/balance`),
  create: (dto: CreateTimePeriodDto) => api.post<TimePeriod>('/time-periods', dto),
  update: (id: number, dto: Partial<CreateTimePeriodDto>) =>
    api.patch<TimePeriod>(`/time-periods/${id}`, dto),
  delete: (id: number) => api.delete(`/time-periods/${id}`),
};
