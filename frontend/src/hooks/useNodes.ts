import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nodesService } from '@/services/nodes.service';
import type { CreateFinanceNodeDto, FinanceNodeType } from '@/models';
import { nodeKeys } from '@/lib/queryKeys';
import { cachePolicy } from '@/lib/cachePolicies';
import { invalidateDomains } from '@/lib/cacheInvalidation';

export function useNodes(archived?: boolean, type?: FinanceNodeType) {
  return useQuery({
    queryKey: nodeKeys.list(archived, type),
    queryFn: () => nodesService.getAll(archived, type),
    ...cachePolicy.reference,
  });
}

export function useNode(id: number) {
  return useQuery({
    queryKey: nodeKeys.detail(id),
    queryFn: () => nodesService.getById(id),
    enabled: !!id,
    ...cachePolicy.reference,
  });
}

export function useNodeBalance(id: number) {
  return useQuery({
    queryKey: nodeKeys.balance(id),
    queryFn: () => nodesService.getBalance(id),
    enabled: !!id,
    ...cachePolicy.derived,
  });
}

export function useCreateNode() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateFinanceNodeDto) => nodesService.create(dto),
    onSuccess: () => {
      invalidateDomains(qc, ['nodes']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUpdateNode() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateFinanceNodeDto> }) =>
      nodesService.update(id, dto),
    onSuccess: () => {
      invalidateDomains(qc, ['nodes']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useArchiveNode() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => nodesService.archive(id),
    onSuccess: () => {
      invalidateDomains(qc, ['nodes']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUnarchiveNode() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => nodesService.unarchive(id),
    onSuccess: () => {
      invalidateDomains(qc, ['nodes']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteNode() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => nodesService.delete(id),
    onSuccess: () => {
      invalidateDomains(qc, ['nodes']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
