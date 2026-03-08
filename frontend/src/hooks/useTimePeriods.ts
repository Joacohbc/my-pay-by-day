import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timePeriodsService } from '@/services/time-periods.service';
import type { CreateTimePeriodDto } from '@/models';

export const TIME_PERIODS_KEY = ['time-periods'] as const;

export function useTimePeriods() {
  return useQuery({
    queryKey: TIME_PERIODS_KEY,
    queryFn: timePeriodsService.getAll,
  });
}

export function useTimePeriodBalance(id: number | null) {
  return useQuery({
    queryKey: [...TIME_PERIODS_KEY, id, 'balance'] as const,
    queryFn: () => timePeriodsService.getBalance(id!),
    enabled: id !== null,
  });
}

export function useCreateTimePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTimePeriodDto) => timePeriodsService.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: TIME_PERIODS_KEY }),
  });
}

export function useUpdateTimePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateTimePeriodDto> }) =>
      timePeriodsService.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: TIME_PERIODS_KEY }),
  });
}

export function useDeleteTimePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => timePeriodsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TIME_PERIODS_KEY }),
  });
}
