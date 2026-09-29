import type { TimePeriod, TimePeriodBalance, DynamicTimePeriodBalance, CreateTimePeriodDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

function displayCurrencyQuery(displayCurrency: string | null, separator: '?' | '&'): string {
  return displayCurrency ? `${separator}currency=${displayCurrency}` : '';
}

export const timePeriodsService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<TimePeriod>>(`/time-periods?page=${page}&size=${size}`),
  getById: (id: number) => api.get<TimePeriod>(`/time-periods/${id}`),
  getBalance: (id: number, displayCurrency: string | null) =>
    api.get<TimePeriodBalance>(`/time-periods/${id}/balance${displayCurrencyQuery(displayCurrency, '?')}`),
  getDynamicBalance: (startDate: string, endDate: string, displayCurrency: string | null) =>
    api.get<DynamicTimePeriodBalance>(
      `/time-periods/dynamic-balance?startDate=${startDate}&endDate=${endDate}${displayCurrencyQuery(displayCurrency, '&')}`
    ),
  create: (dto: CreateTimePeriodDto) => api.post<TimePeriod>('/time-periods', dto),
  update: (id: number, dto: Partial<CreateTimePeriodDto>) =>
    api.patch<TimePeriod>(`/time-periods/${id}`, dto),
  delete: (id: number) => api.delete(`/time-periods/${id}`),
};
