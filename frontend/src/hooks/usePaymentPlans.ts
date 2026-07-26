import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentPlanKeys } from '@/lib/queryKeys';
import { paymentPlansService } from '@/services/paymentPlans.service';
import type { CreatePaymentPlanDto, CreatePaymentPlanItemDto } from '@/models';

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentPlanDto) => paymentPlansService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all });
    },
  });
}

export function useCancelPaymentPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => paymentPlansService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all });
    },
  });
}

export function useUpdatePaymentPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CreatePaymentPlanDto }) =>
      paymentPlansService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all });
    },
  });
}

export function usePaymentPlanItem(planId: number, itemId: number) {
  return useQuery({
    queryKey: paymentPlanKeys.item(planId, itemId),
    queryFn: () => paymentPlansService.getItemById(planId, itemId),
    enabled: planId > 0 && itemId > 0,
  });
}

export function useCreatePaymentPlanItem(planId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreatePaymentPlanItemDto) => paymentPlansService.createItem(planId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all });
    },
  });
}

export function useUpdatePaymentPlanItem(planId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, dto }: { itemId: number; dto: CreatePaymentPlanItemDto }) =>
      paymentPlansService.updateItem(planId, itemId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all });
    },
  });
}

export function useDeletePaymentPlanItem(planId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => paymentPlansService.deleteItem(planId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all });
    },
  });
}
