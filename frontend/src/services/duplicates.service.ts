import { api } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DuplicateRecord,
  DuplicateDetectionSettings,
  ResolveDuplicateRequest,
  SelectableEntityType,
  DuplicateRecordStatus
} from '@/models';

const DUPLICATES_KEYS = {
  all: ['duplicates'] as const,
  byType: (type: SelectableEntityType, status: DuplicateRecordStatus) => [...DUPLICATES_KEYS.all, type, status] as const,
  byEntity: (type: SelectableEntityType, id: number, status: DuplicateRecordStatus) => [...DUPLICATES_KEYS.all, 'entity', type, id, status] as const,
  settings: ['duplicate-settings'] as const,
};

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

export function useDuplicates(type: SelectableEntityType, status: DuplicateRecordStatus) {
  return useQuery({
    queryKey: DUPLICATES_KEYS.byType(type, status),
    queryFn: () => duplicatesApi.getDuplicates(type, status),
  });
}

export function useEntityDuplicates(
  type: SelectableEntityType,
  id: number,
  status: DuplicateRecordStatus = 'PENDING',
) {
  return useQuery({
    queryKey: DUPLICATES_KEYS.byEntity(type, id, status),
    queryFn: () => duplicatesApi.getDuplicatesForEntity(type, id, status),
    enabled: !!id,
  });
}

export function useResolveDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: ResolveDuplicateRequest }) =>
      duplicatesApi.resolveDuplicate(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DUPLICATES_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDuplicateSettings() {
  return useQuery({
    queryKey: DUPLICATES_KEYS.settings,
    queryFn: duplicatesApi.getSettings,
  });
}

export function useUpdateDuplicateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: duplicatesApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DUPLICATES_KEYS.settings });
    },
  });
}

export function useScanAllDuplicates() {
  return useMutation({
    mutationFn: duplicatesApi.scanAll,
  });
}
