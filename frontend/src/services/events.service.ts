import type { FinanceEvent, CreateEventDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export type DateField = 'TRANSACTION' | 'CREATED' | 'UPDATED';

export interface EventFilters {
  page?: number;
  size?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  dateField?: DateField;
  type?: string;
  categoryId?: number;
  tagId?: number;
}

export const eventsService = {
  getAll: (filters: EventFilters = {}) => {
    const params = new URLSearchParams();
    params.append('page', (filters.page ?? 0).toString());
    params.append('size', (filters.size ?? 20).toString());

    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.dateField) params.append('dateField', filters.dateField);
    if (filters.type && filters.type !== 'ALL') params.append('type', filters.type);
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.tagId) params.append('tagId', filters.tagId.toString());

    return api.get<PagedResponse<FinanceEvent>>(`/events?${params.toString()}`);
  },
  getById: (id: number) => api.get<FinanceEvent>(`/events/${id}`),
  create: (dto: CreateEventDto) => api.post<FinanceEvent>('/events', dto),
  update: (id: number, dto: Partial<CreateEventDto>) =>
    api.patch<FinanceEvent>(`/events/${id}`, dto),
  delete: (id: number) => api.delete(`/events/${id}`),
  addRelations: (id: number, relatedIds: number[]) =>
    api.post<FinanceEvent>(`/events/${id}/relations`, relatedIds),
  removeRelations: (id: number, relatedIds: number[]) =>
    api.delete<FinanceEvent>(`/events/${id}/relations`, relatedIds),
};
