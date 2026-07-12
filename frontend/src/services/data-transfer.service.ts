import type { DataTransferResult } from '@/models';
import { api } from '@/services/api';

export const dataTransferService = {
  exportAll: () => api.getBlob('/data/export'),
  importAll: (blob: Blob) => api.postBinary<DataTransferResult>('/data/import', blob, 'application/zip'),
};
