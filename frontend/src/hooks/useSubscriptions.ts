import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsService } from '@/services/subscriptions.service';
import type { CreateSubscriptionDto } from '@/models';
import { subscriptionKeys } from '@/lib/queryKeys';
import { cachePolicy } from '@/lib/cachePolicies';
import { invalidateDomains } from '@/lib/cacheInvalidation';

export function useSubscriptions(page = 0, size = 20) {
  return useQuery({
    queryKey: subscriptionKeys.list(page, size),
    queryFn: () => subscriptionsService.getAll(page, size),
    ...cachePolicy.transactional,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateSubscriptionDto) => subscriptionsService.create(dto),
    onSuccess: () => {
      invalidateDomains(qc, ['subscriptions']);
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
      invalidateDomains(qc, ['subscriptions']);
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
      invalidateDomains(qc, ['subscriptions']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
