import { api } from '@/services/api';
import type {
  DuplicateRecord,
  DuplicateDetectionSettings,
  ResolveDuplicateRequest,
  SelectableEntityType,
  DuplicateRecordStatus
} from '@/models';

export const duplicatesApi = {
  getDuplicates: (type: SelectableEntityType, status: DuplicateRecordStatus) =>
    api.get<DuplicateRecord[]>(`/duplicates?type=${type}&status=${status}`),

  getDuplicatesForEntity: (type: SelectableEntityType, id: number, status: DuplicateRecordStatus = 'PENDING') =>
    api.get<DuplicateRecord[]>(`/duplicates/entity/${type}/${id}?status=${status}`),

  resolveDuplicate: (id: number, request: ResolveDuplicateRequest) =>
    api.post<void>(`/duplicates/${id}/resolve`, request),

  getSettings: () =>
    api.get<DuplicateDetectionSettings>('/settings/duplicates'),

  updateSettings: (settings: Partial<DuplicateDetectionSettings>) =>
    api.put<DuplicateDetectionSettings>('/settings/duplicates', settings),

  scanAll: () =>
    api.post<void>('/settings/duplicates/scan-all', {}),
};
