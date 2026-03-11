import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nodesService } from '@/services/nodes.service';
import type { CreateFinanceNodeDto } from '@/models';

export const NODES_KEY = ['financeNodes'] as const;

export function useNodes(page = 0, size = 20) {
  return useQuery({
    queryKey: [...NODES_KEY, page, size],
    queryFn: () => nodesService.getAll(page, size),
  });
}

export function useNode(id: number) {
  return useQuery({
    queryKey: [...NODES_KEY, id],
    queryFn: () => nodesService.getById(id),
    enabled: !!id,
  });
}

export function useNodeBalance(id: number) {
  return useQuery({
    queryKey: [...NODES_KEY, id, 'balance'],
    queryFn: () => nodesService.getBalance(id),
    enabled: !!id,
  });
}

export function useCreateNode() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateFinanceNodeDto) => nodesService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NODES_KEY  });
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
      qc.invalidateQueries({ queryKey: NODES_KEY  });
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
      qc.invalidateQueries({ queryKey: NODES_KEY  });
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
      qc.invalidateQueries({ queryKey: NODES_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
