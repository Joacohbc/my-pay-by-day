import type { FinanceTransaction } from '@/models';
import { api } from '@/services/api';

export const transactionsService = {
  getAll: () => api.get<FinanceTransaction[]>('/transactions'),
  getById: (id: number) => api.get<FinanceTransaction>(`/transactions/${id}`),
};
