import type { FinanceNode, CreateFinanceNodeDto, PagedResponse, FinanceNodeType } from '@/models';
import { api } from '@/services/api';

export const nodesService = {
  getAll: (page = 0, size = 20, archived?: boolean, type?: FinanceNodeType) => {
    let url = `/finance-nodes?page=${page}&size=${size}`;
    if (archived !== undefined) {
      url += `&archived=${archived}`;
    }
    if (type !== undefined) {
      url += `&type=${type}`;
    }
    return api.get<PagedResponse<FinanceNode>>(url);
  },
  getById: (id: number) => api.get<FinanceNode>(`/finance-nodes/${id}`),
  getBalance: (id: number) => api.get<number>(`/finance-nodes/${id}/balance`),
  create: (dto: CreateFinanceNodeDto) => api.post<FinanceNode>('/finance-nodes', dto),
  update: (id: number, dto: Partial<CreateFinanceNodeDto>) =>
    api.put<FinanceNode>(`/finance-nodes/${id}`, dto),
  archive: (id: number) => api.post<void>(`/finance-nodes/${id}/archive`, {}),
  unarchive: (id: number) => api.post<void>(`/finance-nodes/${id}/unarchive`, {}),
  delete: (id: number) => api.delete(`/finance-nodes/${id}`),
};
