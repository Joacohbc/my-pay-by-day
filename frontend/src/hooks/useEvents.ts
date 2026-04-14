import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { eventsService, type EventFilters } from '@/services/events.service';
import { usePendingEventsStore } from '@/store/pendingEventsStore';
import type { CreateEventDto, PatchEventDto, FinanceEvent, Category, Tag, FinanceNode, FinanceLineItem } from '@/models';
import {
  type QueriesSnapshot,
  snapshotAndCancel,
  restoreSnapshot,
  updateItemInLists,
  removeItemFromLists,
  findInPagedListCaches,
} from '@/hooks/optimistic';
import { categoryKeys } from '@/hooks/useCategories';
import { tagKeys } from '@/hooks/useTags';
import { NODES_KEY } from '@/hooks/useNodes';

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
};

export const EVENTS_KEY = eventKeys.all;

function resolveErrorMessage(err: unknown, fallbackMessage: string): string {
  return err instanceof Error ? err.message : fallbackMessage;
}

function resolveCategory(
  categoryRef: { id: number } | null | undefined,
  queryClient: QueryClient
): Category | undefined {
  if (categoryRef === undefined) return undefined;
  if (categoryRef === null) return undefined;
  return queryClient.getQueryData<Category>(categoryKeys.detail(categoryRef.id))
    ?? findInPagedListCaches<Category>(queryClient, categoryKeys.lists(), categoryRef.id)
    ?? ({ id: categoryRef.id } as Category);
}

function resolveTags(
  tagRefs: { id: number }[] | null | undefined,
  queryClient: QueryClient
): Tag[] | undefined {
  if (tagRefs === undefined) return undefined;
  if (tagRefs === null) return [];
  return tagRefs.map(({ id }) =>
    queryClient.getQueryData<Tag>(tagKeys.detail(id))
      ?? findInPagedListCaches<Tag>(queryClient, tagKeys.lists(), id)
      ?? ({ id } as Tag)
  );
}

function resolveLineItems(
  lineItemDtos: { financeNode: { id: number }; amount: number }[],
  queryClient: QueryClient
): FinanceLineItem[] {
  return lineItemDtos.map(({ financeNode, amount }) => {
    const cachedNode = queryClient.getQueryData<FinanceNode>([...NODES_KEY, financeNode.id])
      ?? findInPagedListCaches<FinanceNode>(queryClient, NODES_KEY, financeNode.id);
    return {
      financeNodeId: financeNode.id,
      financeNodeName: cachedNode?.name ?? '',
      amount,
    };
  });
}

/**
 * Translates a PatchEventDto into a Partial<FinanceEvent> suitable for optimistic cache updates.
 *
 * Why this exists: PatchEventDto carries only IDs for related entities
 * (e.g. `category: { id: 5 }`, `tags: [{ id: 1 }]`, `lineItems: [{ financeNode: { id: 3 } }]`).
 * Applying it directly to the FinanceEvent cache would overwrite rich objects
 * (name, icon, financeNodeName…) with bare ID stubs, breaking the UI instantly.
 *
 * This function resolves each ID against the query cache to recover the full object.
 * If an entity is not cached yet (user hasn't visited its detail view), a minimal
 * placeholder carrying only the ID is used instead — onSettled will sync the real
 * data from the server once the mutation settles.
 */
function enrichPatchWithCachedEntities(
  dto: PatchEventDto,
  queryClient: QueryClient
): Partial<FinanceEvent> {
  const enrichedPatch: Partial<FinanceEvent> = {};

  if (dto.name !== undefined) enrichedPatch.name = dto.name;
  if (dto.description !== undefined) enrichedPatch.description = dto.description ?? undefined;
  if (dto.type !== undefined) enrichedPatch.type = dto.type;

  const resolvedCategory = resolveCategory(dto.category, queryClient);
  if (dto.category !== undefined) enrichedPatch.category = resolvedCategory;

  const resolvedTags = resolveTags(dto.tags, queryClient);
  if (dto.tags !== undefined) enrichedPatch.tags = resolvedTags;

  if (dto.transaction) {
    enrichedPatch.transactionDate = dto.transaction.transactionDate;
    enrichedPatch.lineItems = resolveLineItems(dto.transaction.lineItems, queryClient);
  }

  return enrichedPatch;
}

export function useEvents(filters: EventFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => eventsService.getAll(filters),
    enabled: options?.enabled,
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  const addPending = usePendingEventsStore((s) => s.addPending);

  const mutation = useMutation({
    mutationFn: (dto: CreateEventDto) => eventsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });

  /** Online: calls the API and returns the created event. Offline: queues locally and returns null. */
  const saveAsync = async (dto: CreateEventDto): Promise<FinanceEvent | null> => {
    if (!navigator.onLine) {
      addPending(dto);
      return null;
    }
    return mutation.mutateAsync(dto);
  };

  return { ...mutation, saveAsync };
}

interface EventMutationContext {
  previousLists?: QueriesSnapshot;
  previousEventDetail?: FinanceEvent;
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation<FinanceEvent, Error, { id: number; dto: PatchEventDto }, EventMutationContext>({
    mutationFn: ({ id, dto }) => eventsService.update(id, dto),
    onMutate: async ({ id, dto }) => {
      const previousLists = await snapshotAndCancel(queryClient, eventKeys.lists());
      const previousEventDetail = queryClient.getQueryData<FinanceEvent>(eventKeys.detail(id));
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(id) });

      const enrichedPatch = enrichPatchWithCachedEntities(dto, queryClient);

      const applyPatchToDetailCache = (cachedDetail: FinanceEvent) =>
        queryClient.setQueryData<FinanceEvent>(
          eventKeys.detail(id),
          { ...cachedDetail, ...enrichedPatch }
        );

      updateItemInLists<FinanceEvent>(queryClient, eventKeys.lists(), id, enrichedPatch);
      if (previousEventDetail) applyPatchToDetailCache(previousEventDetail);

      return { previousLists, previousEventDetail };
    },
    onError: (err, { id }, context) => {
      if (context?.previousLists) restoreSnapshot(queryClient, context.previousLists);
      if (context?.previousEventDetail) queryClient.setQueryData(eventKeys.detail(id), context.previousEventDetail);
      alert.error(resolveErrorMessage(err, t('common.error')));
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
    },
    onSuccess: () => alert.success(t('common.saved')),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation<void, Error, number, EventMutationContext>({
    mutationFn: (id) => eventsService.delete(id),
    onMutate: async (id) => {
      const previousLists = await snapshotAndCancel(queryClient, eventKeys.lists());
      removeItemFromLists<FinanceEvent>(queryClient, eventKeys.lists(), id);
      queryClient.removeQueries({ queryKey: eventKeys.detail(id) });
      return { previousLists };
    },
    onError: (err, _id, context) => {
      if (context?.previousLists) restoreSnapshot(queryClient, context.previousLists);
      alert.error(resolveErrorMessage(err, t('common.error')));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
    onSuccess: () => alert.success(t('common.saved')),
  });
}

export function useAddEventRelations() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, relatedIds }: { id: number; relatedIds: number[] }) =>
      eventsService.addRelations(id, relatedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

export function useRemoveEventRelations() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, relatedIds }: { id: number; relatedIds: number[] }) =>
      eventsService.removeRelations(id, relatedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

export function useMergeEvents() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ baseId, sourceIds, groupByNodeIds }: { baseId: number; sourceIds: number[]; groupByNodeIds: number[] }) =>
      eventsService.mergeEvents(baseId, sourceIds, groupByNodeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      alert.success(t('events.mergeSuccess'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}
