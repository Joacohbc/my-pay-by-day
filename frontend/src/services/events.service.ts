import type { FinanceEvent, CreateEventDto } from '@/models';
import { api } from '@/services/api';

export const eventsService = {
  getAll: () => api.get<FinanceEvent[]>('/events'),
  getById: (id: number) => api.get<FinanceEvent>(`/events/${id}`),
  create: (dto: CreateEventDto) => api.post<FinanceEvent>('/events', dto),
  update: (id: number, dto: Partial<CreateEventDto>) =>
    api.put<FinanceEvent>(`/events/${id}`, dto),
  delete: (id: number) => api.delete(`/events/${id}`),
};
