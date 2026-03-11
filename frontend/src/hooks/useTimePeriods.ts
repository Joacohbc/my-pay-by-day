import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timePeriodsService } from '@/services/time-periods.service';
import type { CreateTimePeriodDto } from '@/models';

export const TIME_PERIODS_KEY = ['time-periods'] as const;

export function useTimePeriods(page = 0, size = 20) {
  return useQuery({
    queryKey: [...TIME_PERIODS_KEY, page, size],
    queryFn: () => timePeriodsService.getAll(page, size),
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
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateTimePeriodDto) => timePeriodsService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TIME_PERIODS_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUpdateTimePeriod() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateTimePeriodDto> }) =>
      timePeriodsService.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TIME_PERIODS_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteTimePeriod() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => timePeriodsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TIME_PERIODS_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
