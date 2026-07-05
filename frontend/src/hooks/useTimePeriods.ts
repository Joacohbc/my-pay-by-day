import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timePeriodsService } from '@/services/time-periods.service';
import type { CreateTimePeriodDto } from '@/models';
import { timePeriodKeys } from '@/lib/queryKeys';
import { cachePolicy } from '@/lib/cachePolicies';
import { invalidateDomains } from '@/lib/cacheInvalidation';

export function useTimePeriods(page = 0, size = 20) {
  return useQuery({
    queryKey: timePeriodKeys.list(page, size),
    queryFn: () => timePeriodsService.getAll(page, size),
    ...cachePolicy.transactional,
  });
}

export function useTimePeriodBalance(id: number | null) {
  return useQuery({
    queryKey: timePeriodKeys.balance(id),
    queryFn: () => timePeriodsService.getBalance(id!),
    enabled: id !== null,
    ...cachePolicy.derived,
  });
}

export function useDynamicTimePeriodBalance(startDate: string | null, endDate: string | null) {
  return useQuery({
    queryKey: timePeriodKeys.dynamicBalance(startDate, endDate),
    queryFn: () => timePeriodsService.getDynamicBalance(startDate!, endDate!),
    enabled: startDate !== null && endDate !== null,
    ...cachePolicy.derived,
  });
}

export function useCreateTimePeriod() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateTimePeriodDto) => timePeriodsService.create(dto),
    onSuccess: () => {
      invalidateDomains(qc, ['timePeriods']);
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
      invalidateDomains(qc, ['timePeriods']);
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
      invalidateDomains(qc, ['timePeriods']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
