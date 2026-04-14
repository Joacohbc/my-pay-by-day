import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { selectionHistoryService } from '@/services/selection-history.service';
import type { SelectableEntityType, UsageStats } from '@/models';


const QUERY_KEY = 'selection-history';

export function useUsageStats(entityType: SelectableEntityType) {
  return useQuery<UsageStats[]>({
    queryKey: [QUERY_KEY, entityType],
    queryFn: () => selectionHistoryService.getStats(entityType),

    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useRecordSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id }: { type: SelectableEntityType; id: number }) =>
      selectionHistoryService.record(type, id),
    onSuccess: (_, variables) => {
      // Invalidate the specific stats to reflect the change on next fetch
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.type] });
    },
  });
}
