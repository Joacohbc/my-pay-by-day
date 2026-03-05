import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '@/services/events.service';
import type { CreateEventDto } from '@/models';

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
  return useMutation({
    mutationFn: (dto: CreateEventDto) => eventsService.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateEventDto> }) =>
      eventsService.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eventsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}
