import type { DataExportSummaryDto, DataTransferResult } from '@/models';
import { api } from '@/services/api';

export const dataTransferService = {
  getExportSummary: () => api.get<DataExportSummaryDto>('/data/export/summary'),
  exportAll: () => api.getBlob('/data/export'),
  importAll: (blob: Blob) => api.postBinary<DataTransferResult>('/data/import', blob, 'application/zip'),
};
