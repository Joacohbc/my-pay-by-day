import type { CreateEventDto, EntityDraft, FinanceEvent } from '@/models';
import { api } from '@/services/api';

export const draftsService = {
  getFinanceEventDrafts: () => api.get<FinanceEvent[]>('/entity-drafts/finance-events'),

  getById: (id: number) => api.get<EntityDraft>(`/entity-drafts/${id}`),

  createFinanceEventDraft: (dto: Partial<CreateEventDto>) => 
    api.post<EntityDraft>('/entity-drafts/finance-events', dto),

  updateFinanceEventDraft: (id: number, dto: Partial<CreateEventDto>) =>
    api.patch<EntityDraft>(`/entity-drafts/finance-events/${id}`, dto),

  delete: (id: number) => api.delete(`/entity-drafts/${id}`),
};
