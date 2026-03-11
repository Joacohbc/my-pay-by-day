import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsService } from '@/services/tags.service';
import type { CreateTagDto } from '@/models';

export const TAGS_KEY = ['tags'] as const;

export function useTags() {
  return useQuery({ queryKey: TAGS_KEY, queryFn: tagsService.getAll });
}

export function useCreateTag() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateTagDto) => tagsService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAGS_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateTagDto> }) =>
      tagsService.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAGS_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => tagsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAGS_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
