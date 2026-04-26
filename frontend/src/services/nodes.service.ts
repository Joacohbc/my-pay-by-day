import type { FinanceNode, CreateFinanceNodeDto, FinanceNodeType } from '@/models';
import { api } from '@/services/api';

export const nodesService = {
  getAll: (archived?: boolean, type?: FinanceNodeType) => {
    const params: string[] = [];
    if (archived !== undefined) params.push(`archived=${archived}`);
    if (type !== undefined) params.push(`type=${type}`);
    const url = params.length ? `/finance-nodes?${params.join('&')}` : '/finance-nodes';
    return api.get<FinanceNode[]>(url);
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
