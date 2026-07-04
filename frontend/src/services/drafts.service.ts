import type { ConfirmDraftsRequestDto, ConfirmDraftsResultDto, EntityDraft, FinanceEvent, FinanceEventDraftInputDto } from '@/models';
import { api } from '@/services/api';

export const draftsService = {
  getFinanceEventDrafts: () => api.get<FinanceEvent[]>('/drafts/finance-events'),

  getById: (id: number) => api.get<EntityDraft>(`/drafts/${id}`),

  getFinanceEventDraftByEntityId: (entityId: number) =>
    api.get<FinanceEvent | null>(`/drafts/finance-events/by-entity/${entityId}`),

  createStandaloneFinanceEventDraft: (dto: FinanceEventDraftInputDto) =>
    api.post<EntityDraft>('/drafts/finance-events', dto),

  updateFinanceEventDraftByDraftId: (id: number, dto: FinanceEventDraftInputDto) =>
    api.patch<EntityDraft>(`/drafts/finance-events/${id}`, dto),

  upsertFinanceEventDraftByEventId: (eventId: number, dto: FinanceEventDraftInputDto) =>
    api.put<EntityDraft>(`/drafts/finance-events/by-entity/${eventId}`, dto),

  confirmDraftsBatch: (request: ConfirmDraftsRequestDto) =>
    api.post<ConfirmDraftsResultDto>('/drafts/finance-events/confirm-batch', request),

  delete: (id: number) => api.delete(`/drafts/${id}`),

  deleteFinanceEventDrafts: () => api.delete('/drafts/finance-events'),
};
