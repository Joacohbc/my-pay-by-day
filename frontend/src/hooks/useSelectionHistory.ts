import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { selectionHistoryService } from '@/services/selection-history.service';
import type { SelectableEntityType, UsageStats } from '@/models';
import { selectionHistoryKeys } from '@/lib/queryKeys';
import { cachePolicy } from '@/lib/cachePolicies';

export function useUsageStats(entityType: SelectableEntityType) {
  return useQuery<UsageStats[]>({
    queryKey: selectionHistoryKeys.byType(entityType),
    queryFn: () => selectionHistoryService.getStats(entityType),
    ...cachePolicy.reference,
  });
}

export function useRecordSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id }: { type: SelectableEntityType; id: number }) =>
      selectionHistoryService.record(type, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: selectionHistoryKeys.byType(variables.type) });
    },
  });
}
