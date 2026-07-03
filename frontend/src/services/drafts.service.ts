import type { EntityDraft, FinanceEvent, FinanceEventDraftInputDto } from '@/models';
import { api } from '@/services/api';

export const draftsService = {
  getFinanceEventDrafts: () => api.get<FinanceEvent[]>('/drafts/finance-events'),

  getById: (id: number) => api.get<EntityDraft>(`/drafts/${id}`),

  getFinanceEventDraftByEntityId: (entityId: number) =>
    api.get<FinanceEvent | null>(`/drafts/finance-events/by-entity/${entityId}`),

  createFinanceEventDraft: (dto: FinanceEventDraftInputDto) =>
    api.post<EntityDraft>('/drafts/finance-events', dto),

  updateFinanceEventDraft: (id: number, dto: FinanceEventDraftInputDto) =>
    api.patch<EntityDraft>(`/drafts/finance-events/${id}`, dto),

  delete: (id: number) => api.delete(`/drafts/${id}`),

  deleteFinanceEventDrafts: () => api.delete('/drafts/finance-events'),
};
