import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { Identifiable, PagedResponse } from '@/models';

export type QueriesSnapshot = [QueryKey, unknown][];

export async function snapshotAndCancel(
  queryClient: QueryClient,
  queriesKeyPrefix: readonly unknown[]
): Promise<QueriesSnapshot> {
  await queryClient.cancelQueries({ queryKey: queriesKeyPrefix });
  return queryClient.getQueriesData({ queryKey: queriesKeyPrefix });
}

export function restoreSnapshot(queryClient: QueryClient, snapshot: QueriesSnapshot) {
  for (const [queryKey, queryData] of snapshot) {
    queryClient.setQueryData(queryKey, queryData);
  }
}

export function updateItemInLists<T extends Identifiable>(
  queryClient: QueryClient,
  listsKeyPrefix: readonly unknown[],
  targetId: number,
  patch: Partial<T>
) {
  const applyPatchToMatchingItem = (item: T): T =>
    item.id === targetId ? { ...item, ...patch } : item;

  const updatePageContent = (page: PagedResponse<T>): PagedResponse<T> => ({
    ...page,
    content: page.content.map(applyPatchToMatchingItem),
  });

  queryClient.setQueriesData<PagedResponse<T>>(
    { queryKey: listsKeyPrefix },
    (currentPage) => currentPage ? updatePageContent(currentPage) : currentPage
  );
}

export function removeItemFromLists<T extends Identifiable>(
  queryClient: QueryClient,
  listsKeyPrefix: readonly unknown[],
  targetId: number
) {
  const isNotTargetItem = (item: T) => item.id !== targetId;

  const removeFromPageContent = (page: PagedResponse<T>): PagedResponse<T> => ({
    ...page,
    content: page.content.filter(isNotTargetItem),
    totalElements: page.totalElements - 1,
  });

  queryClient.setQueriesData<PagedResponse<T>>(
    { queryKey: listsKeyPrefix },
    (currentPage) => currentPage ? removeFromPageContent(currentPage) : currentPage
  );
}
