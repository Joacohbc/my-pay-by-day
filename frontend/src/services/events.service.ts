import type { FinanceEvent, CreateEventDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export const eventsService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<FinanceEvent>>(`/events?page=${page}&size=${size}`),
  getById: (id: number) => api.get<FinanceEvent>(`/events/${id}`),
  create: (dto: CreateEventDto) => api.post<FinanceEvent>('/events', dto),
  update: (id: number, dto: Partial<CreateEventDto>) =>
    api.patch<FinanceEvent>(`/events/${id}`, dto),
  delete: (id: number) => api.delete(`/events/${id}`),
};
