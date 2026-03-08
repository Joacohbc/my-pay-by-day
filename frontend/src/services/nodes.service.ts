import type { FinanceNode, CreateFinanceNodeDto } from '@/models';
import { api } from '@/services/api';

export const nodesService = {
  getAll: () => api.get<FinanceNode[]>('/finance-nodes'),
  getById: (id: number) => api.get<FinanceNode>(`/finance-nodes/${id}`),
  getBalance: (id: number) => api.get<number>(`/finance-nodes/${id}/balance`),
  create: (dto: CreateFinanceNodeDto) => api.post<FinanceNode>('/finance-nodes', dto),
  update: (id: number, dto: Partial<CreateFinanceNodeDto>) =>
    api.put<FinanceNode>(`/finance-nodes/${id}`, dto),
  archive: (id: number) => api.put<void>(`/finance-nodes/${id}/archive`, {}),
  delete: (id: number) => api.delete(`/finance-nodes/${id}`),
};
