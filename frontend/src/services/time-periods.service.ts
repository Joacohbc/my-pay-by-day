import type { TimePeriod, TimePeriodBalance, CreateTimePeriodDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export const timePeriodsService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<TimePeriod>>(`/time-periods?page=${page}&size=${size}`),
  getById: (id: number) => api.get<TimePeriod>(`/time-periods/${id}`),
  getBalance: (id: number) => api.get<TimePeriodBalance>(`/time-periods/${id}/balance`),
  create: (dto: CreateTimePeriodDto) => api.post<TimePeriod>('/time-periods', dto),
  update: (id: number, dto: Partial<CreateTimePeriodDto>) =>
    api.patch<TimePeriod>(`/time-periods/${id}`, dto),
  delete: (id: number) => api.delete(`/time-periods/${id}`),
};
