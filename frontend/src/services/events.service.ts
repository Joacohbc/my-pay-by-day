import type { FinanceEvent, CreateEventDto, PatchEventDto, BulkPatchEventDto, PagedResponse } from '@/models';
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
  categoryIds?: number[];
  tagIds?: number[];
  nodeId?: number;
  minAmount?: number;
  maxAmount?: number;
  /** Display currency: a principal one converts every event, any other keeps only its own events. */
  currency?: string | null;
}

/** Income, outbound and transfer totals for one currency in the match set. */
export interface CurrencyTotals {
  currency: string;
  income: number;
  outbound: number;
  transfers: number;
  /** Events left out of a converted view because they carry no rate into its currency yet. */
  unconvertedEvents?: number;
}

/**
 * Aggregate totals for every event matching a filter set, independent of pagination.
 *
 * Without a display currency it is one entry per currency, since amounts of different currencies
 * are never summed; with one it is a single entry in that currency.
 */
export interface EventTotals {
  totals: CurrencyTotals[];
  /** Count of matching events across all currencies. */
  totalElements: number;
}

function buildEventFilterParams(filters: EventFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.dateField) params.append('dateField', filters.dateField);
  if (filters.type && filters.type !== 'ALL') params.append('type', filters.type);
  if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
  if (filters.tagId) params.append('tagId', filters.tagId.toString());
  filters.categoryIds?.forEach((id) => params.append('categoryIds', id.toString()));
  filters.tagIds?.forEach((id) => params.append('tagIds', id.toString()));
  if (filters.nodeId) params.append('nodeId', filters.nodeId.toString());
  if (filters.minAmount !== undefined) params.append('minAmount', filters.minAmount.toString());
  if (filters.maxAmount !== undefined) params.append('maxAmount', filters.maxAmount.toString());
  if (filters.currency) params.append('currency', filters.currency);

  return params;
}

export const eventsService = {
  getAll: (filters: EventFilters = {}) => {
    const params = buildEventFilterParams(filters);
    params.append('page', (filters.page ?? 0).toString());
    params.append('size', (filters.size ?? 20).toString());

    return api.get<PagedResponse<FinanceEvent>>(`/events?${params.toString()}`);
  },
  getSummary: (filters: EventFilters = {}) => {
    const params = buildEventFilterParams(filters);
    return api.get<EventTotals>(`/events/summary?${params.toString()}`);
  },
  getById: (id: number) => api.get<FinanceEvent>(`/events/${id}`),
  create: (dto: CreateEventDto) => api.post<FinanceEvent>('/events', dto),
  update: (id: number, dto: PatchEventDto) =>
    api.patch<FinanceEvent>(`/events/${id}`, dto),
  delete: (id: number) => api.delete(`/events/${id}`),
  addRelations: (id: number, relatedIds: number[]) =>
    api.post<FinanceEvent>(`/events/${id}/relations`, relatedIds),
  removeRelations: (id: number, relatedIds: number[]) =>
    api.delete<FinanceEvent>(`/events/${id}/relations`, relatedIds),
  mergeEvents: (baseId: number, sourceIds: number[], groupByNodeIds: number[], categoryId: number | null, tagIds: number[], name: string, description: string) =>
    api.post<FinanceEvent>(`/events/${baseId}/merge`, { sourceIds, groupByNodeIds, categoryId, tagIds, name, description }),
  bulkUpdate: (dto: BulkPatchEventDto) =>
    api.patch<FinanceEvent[]>('/events', dto),
};
