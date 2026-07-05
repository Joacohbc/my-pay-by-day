import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { duplicatesApi } from '@/services/duplicates.service';
import type { ResolveDuplicateRequest, SelectableEntityType, DuplicateRecordStatus } from '@/models';
import { duplicateKeys } from '@/lib/queryKeys';
import { invalidateDomains } from '@/lib/cacheInvalidation';

export function useDuplicates(type: SelectableEntityType, status: DuplicateRecordStatus) {
  return useQuery({
    queryKey: duplicateKeys.byType(type, status),
    queryFn: () => duplicatesApi.getDuplicates(type, status),
  });
}

export function useEntityDuplicates(
  type: SelectableEntityType,
  id: number,
  status: DuplicateRecordStatus = 'PENDING',
) {
  return useQuery({
    queryKey: duplicateKeys.byEntity(type, id, status),
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
      invalidateDomains(queryClient, ['duplicates', 'events', 'categories', 'tags', 'drafts']);
    },
  });
}

export function useDuplicateSettings() {
  return useQuery({
    queryKey: duplicateKeys.settings,
    queryFn: duplicatesApi.getSettings,
  });
}

export function useUpdateDuplicateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: duplicatesApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: duplicateKeys.settings });
    },
  });
}

export function useScanAllDuplicates() {
  return useMutation({
    mutationFn: duplicatesApi.scanAll,
  });
}
