import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService, type EventFilters } from '@/services/events.service';
import { usePendingEventsStore } from '@/store/pendingEventsStore';
import type { CreateEventDto, PatchEventDto, FinanceEvent } from '@/models';
import {
  type QueriesSnapshot,
  snapshotAndCancel,
  restoreSnapshot,
  updateItemInLists,
  removeItemFromLists,
} from '@/hooks/optimistic';

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

export function useEvents(filters: EventFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => eventsService.getAll(filters),
    enabled: options?.enabled,
  });
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsService.getById(id),
    enabled: !!id,
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

      const applyPatchToDetailCache = (cachedDetail: FinanceEvent) =>
        queryClient.setQueryData<FinanceEvent>(
          eventKeys.detail(id),
          { ...cachedDetail, ...dto } as FinanceEvent
        );

      updateItemInLists<FinanceEvent>(queryClient, eventKeys.lists(), id, dto as Partial<FinanceEvent>);
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
