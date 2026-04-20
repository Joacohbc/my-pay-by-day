import type { DataTransferDto, DataTransferResult } from '@/models';
import { api } from '@/services/api';

export const dataTransferService = {
  exportAll: () => api.get<DataTransferDto>('/data/export'),
  importAll: (dto: DataTransferDto) => api.post<DataTransferResult>('/data/import', dto),
};
