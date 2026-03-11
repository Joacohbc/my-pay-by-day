import type { FinanceNode, CreateFinanceNodeDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export const nodesService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<FinanceNode>>(`/finance-nodes?page=${page}&size=${size}`),
  getById: (id: number) => api.get<FinanceNode>(`/finance-nodes/${id}`),
  getBalance: (id: number) => api.get<number>(`/finance-nodes/${id}/balance`),
  create: (dto: CreateFinanceNodeDto) => api.post<FinanceNode>('/finance-nodes', dto),
  update: (id: number, dto: Partial<CreateFinanceNodeDto>) =>
    api.patch<FinanceNode>(`/finance-nodes/${id}`, dto),
  archive: (id: number) => api.patch<void>(`/finance-nodes/${id}/archive`, {}),
  delete: (id: number) => api.delete(`/finance-nodes/${id}`),
};
