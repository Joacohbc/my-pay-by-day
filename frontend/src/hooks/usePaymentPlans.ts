import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import { paymentPlanKeys } from '@/lib/queryKeys';
import { invalidateDomains } from '@/lib/cacheInvalidation';
import { paymentPlansService } from '@/services/paymentPlans.service';
import type { AttachToPaymentPlanDto, CreatePaymentPlanDto, CreatePaymentPlanItemDto } from '@/models';

function usePaymentPlanMutationFeedback() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return {
    onSuccess: () => {
      invalidateDomains(queryClient, ['paymentPlans', 'events', 'drafts']);
      alert.success(t('common.saved'));
    },
    onError: (error: unknown) => alert.error(error instanceof Error ? error.message : t('common.error')),
  };
}

export function usePaymentPlans() {
  return useQuery({
    queryKey: paymentPlanKeys.lists(),
    queryFn: () => paymentPlansService.listAll(),
  });
}

export function usePaymentPlan(id: number) {
  return useQuery({
    queryKey: paymentPlanKeys.detail(id),
    queryFn: () => paymentPlansService.getById(id),
    enabled: id > 0,
  });
}

export function useCreatePaymentPlan() {
  return useMutation({
    mutationFn: (data: CreatePaymentPlanDto) => paymentPlansService.create(data),
    ...usePaymentPlanMutationFeedback(),
  });
}

export function useCancelPaymentPlan() {
  return useMutation({
    mutationFn: (id: number) => paymentPlansService.cancel(id),
    ...usePaymentPlanMutationFeedback(),
  });
}

export function useDeletePaymentPlan() {
  return useMutation({
    mutationFn: (id: number) => paymentPlansService.delete(id),
    ...usePaymentPlanMutationFeedback(),
  });
}

export function useUpdatePaymentPlan() {
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CreatePaymentPlanDto }) =>
      paymentPlansService.update(id, dto),
    ...usePaymentPlanMutationFeedback(),
  });
}

export function useCreatePaymentPlanItem(planId: number) {
  return useMutation({
    mutationFn: (dto: CreatePaymentPlanItemDto) => paymentPlansService.createItem(planId, dto),
    ...usePaymentPlanMutationFeedback(),
  });
}

/**
 * Links existing events/drafts to a plan. Every member of a batch goes in one call: the backend
 * claims their entries in a single transaction, so nothing is left to a stale client-side snapshot
 * of which entries are free. The plan is named at mutate time, since a drop target only knows it
 * then.
 */
export function useAttachToPaymentPlan() {
  return useMutation({
    mutationFn: ({ planId, dto }: { planId: number; dto: AttachToPaymentPlanDto }) =>
      paymentPlansService.attachMembers(planId, dto),
    ...usePaymentPlanMutationFeedback(),
  });
}

export function useUpdatePaymentPlanItem(planId: number) {
  return useMutation({
    mutationFn: ({ itemId, dto }: { itemId: number; dto: CreatePaymentPlanItemDto }) =>
      paymentPlansService.updateItem(planId, itemId, dto),
    ...usePaymentPlanMutationFeedback(),
  });
}

export function useDeletePaymentPlanItem(planId: number) {
  return useMutation({
    mutationFn: (itemId: number) => paymentPlansService.deleteItem(planId, itemId),
    ...usePaymentPlanMutationFeedback(),
  });
}
