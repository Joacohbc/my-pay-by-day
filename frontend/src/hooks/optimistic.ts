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

/**
 * Searches all paged list caches matching `listsKeyPrefix` for an item by ID.
 *
 * Detail caches (`keys.detail(id)`) are only populated when the user visits a detail page.
 * Entities loaded via list endpoints (the common case) live only in list caches.
 * This function bridges that gap: it lets callers look up a full entity object even
 * when its dedicated detail query has never been fetched.
 */
export function findInPagedListCaches<T extends Identifiable>(
  queryClient: QueryClient,
  listsKeyPrefix: readonly unknown[],
  targetId: number
): T | undefined {
  const listCaches = queryClient.getQueriesData<PagedResponse<T>>({ queryKey: listsKeyPrefix });
  for (const [, page] of listCaches) {
    const found = page?.content?.find((item) => item.id === targetId);
    if (found) return found;
  }
  return undefined;
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
