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
  const applyPatch = (item: T): T => item.id === targetId ? { ...item, ...patch } : item;

  queryClient.setQueriesData<T[] | PagedResponse<T>>(
    { queryKey: listsKeyPrefix },
    (current) => {
      if (!current) return current;
      if (Array.isArray(current)) return current.map(applyPatch);
      return { ...current, content: current.content.map(applyPatch) };
    }
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
  const listCaches = queryClient.getQueriesData<T[] | PagedResponse<T>>({ queryKey: listsKeyPrefix });
  for (const [, data] of listCaches) {
    if (!data) continue;
    const items = Array.isArray(data) ? data : data.content;
    const found = items.find((item) => item.id === targetId);
    if (found) return found;
  }
  return undefined;
}

export function removeItemFromLists<T extends Identifiable>(
  queryClient: QueryClient,
  listsKeyPrefix: readonly unknown[],
  targetId: number
) {
  const exclude = (item: T) => item.id !== targetId;

  queryClient.setQueriesData<T[] | PagedResponse<T>>(
    { queryKey: listsKeyPrefix },
    (current) => {
      if (!current) return current;
      if (Array.isArray(current)) return current.filter(exclude);
      return { ...current, content: current.content.filter(exclude), totalElements: current.totalElements - 1 };
    }
  );
}
