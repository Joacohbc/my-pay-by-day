import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '@/services/events.service';
import { usePendingEventsStore } from '@/store/pendingEventsStore';
import type { CreateEventDto, FinanceEvent } from '@/models';

export const EVENTS_KEY = ['events'] as const;

export function useEvents() {
  return useQuery({ queryKey: EVENTS_KEY, queryFn: eventsService.getAll });
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: [...EVENTS_KEY, id],
    queryFn: () => eventsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  const addPending = usePendingEventsStore((s) => s.addPending);

  const mutation = useMutation({
    mutationFn: (dto: CreateEventDto) => eventsService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EVENTS_KEY });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });

  /** Saves online (API) or queues locally when offline. Returns null if queued. */
  const saveAsync = async (dto: CreateEventDto): Promise<FinanceEvent | null> => {
    if (!navigator.onLine) {
      addPending(dto);
      return null;
    }
    return mutation.mutateAsync(dto);
  };

  return { ...mutation, saveAsync };
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateEventDto> }) =>
      eventsService.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EVENTS_KEY });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => eventsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EVENTS_KEY });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
