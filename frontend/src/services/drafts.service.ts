import type { EntityDraft, FinanceEvent } from '@/models';
import { api } from '@/services/api';

export const draftsService = {
  getFinanceEventDrafts: () => api.get<FinanceEvent[]>('/entity-drafts/finance-events'),

  getById: (id: number) => api.get<EntityDraft>(`/entity-drafts/${id}`),

  createFinanceEventDraft: (dto: Partial<FinanceEvent>) =>
    api.post<EntityDraft>('/entity-drafts/finance-events', dto),

  updateFinanceEventDraft: (id: number, dto: Partial<FinanceEvent>) =>
    api.patch<EntityDraft>(`/entity-drafts/finance-events/${id}`, dto),

  delete: (id: number) => api.delete(`/entity-drafts/${id}`),
};
