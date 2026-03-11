import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '@/services/categories.service';
import type { CreateCategoryDto } from '@/models';

export const CATEGORIES_KEY = ['categories'] as const;

export function useCategories(page = 0, size = 20) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, page, size],
    queryFn: () => categoriesService.getAll(page, size),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateCategoryDto) => categoriesService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORIES_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateCategoryDto> }) =>
      categoriesService.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORIES_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => categoriesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORIES_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
