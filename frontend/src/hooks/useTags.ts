import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsService } from '@/services/tags.service';
import type { CreateTagDto } from '@/models';

export const TAGS_KEY = ['tags'] as const;

export function useTags() {
  return useQuery({ queryKey: TAGS_KEY, queryFn: tagsService.getAll });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTagDto) => tagsService.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_KEY }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateTagDto> }) =>
      tagsService.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_KEY }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tagsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_KEY }),
  });
}
