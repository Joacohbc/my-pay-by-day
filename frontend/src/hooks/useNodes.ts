import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nodesService } from '@/services/nodes.service';
import type { CreateFinanceNodeDto } from '@/models';

export const NODES_KEY = ['financeNodes'] as const;

export function useNodes() {
  return useQuery({ queryKey: NODES_KEY, queryFn: nodesService.getAll });
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
  return useMutation({
    mutationFn: (dto: CreateFinanceNodeDto) => nodesService.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: NODES_KEY }),
  });
}

export function useUpdateNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateFinanceNodeDto> }) =>
      nodesService.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: NODES_KEY }),
  });
}

export function useArchiveNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => nodesService.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NODES_KEY }),
  });
}

export function useDeleteNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => nodesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NODES_KEY }),
  });
}
