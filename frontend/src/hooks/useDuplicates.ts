import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { duplicatesApi } from '@/services/duplicates.service';
import type { ResolveDuplicateRequest, SelectableEntityType, DuplicateRecordStatus } from '@/models';

export const DUPLICATES_KEYS = {
  all: ['duplicates'] as const,
  byType: (type: SelectableEntityType, status: DuplicateRecordStatus) => ['duplicates', type, status] as const,
  byEntity: (type: SelectableEntityType, id: number, status: DuplicateRecordStatus) => ['duplicates', 'entity', type, id, status] as const,
  settings: ['duplicate-settings'] as const,
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
    staleTime: 0,
    gcTime: 0,
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
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
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
