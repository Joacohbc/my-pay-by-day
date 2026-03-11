import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsService } from '@/services/subscriptions.service';
import type { CreateSubscriptionDto } from '@/models';

export const SUBSCRIPTIONS_KEY = ['subscriptions'] as const;

export function useSubscriptions(page = 0, size = 20) {
  return useQuery({
    queryKey: [...SUBSCRIPTIONS_KEY, page, size],
    queryFn: () => subscriptionsService.getAll(page, size),
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateSubscriptionDto) => subscriptionsService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: number;
      dto: Partial<CreateSubscriptionDto>;
    }) => subscriptionsService.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => subscriptionsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
