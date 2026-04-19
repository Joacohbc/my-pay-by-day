import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '@/services/categories.service';
import type { Category, CreateCategoryDto } from '@/models';
import {
  type QueriesSnapshot,
  snapshotAndCancel,
  restoreSnapshot,
  updateItemInLists,
  removeItemFromLists,
} from '@/hooks/optimistic';

const FIVE_MINUTES_MS = 1000 * 60 * 5;

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (page: number, size: number, archived?: boolean) => [...categoryKeys.lists(), page, size, archived] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: number) => [...categoryKeys.details(), id] as const,
};

export const CATEGORIES_KEY = categoryKeys.all;

function resolveErrorMessage(err: unknown, fallbackMessage: string): string {
  return err instanceof Error ? err.message : fallbackMessage;
}

export function useCategories(page = 0, size = 20, archived?: boolean) {
  return useQuery({
    queryKey: categoryKeys.list(page, size, archived),
    queryFn: () => categoriesService.getAll(page, size, archived),
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => categoriesService.getById(id),
    enabled: !!id,
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (dto: CreateCategoryDto) => categoriesService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

interface CategoryMutationContext {
  previousLists?: QueriesSnapshot;
  previousCategoryDetail?: Category;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation<Category, Error, { id: number; dto: Partial<CreateCategoryDto> }, CategoryMutationContext>({
    mutationFn: ({ id, dto }) => categoriesService.update(id, dto),
    onMutate: async ({ id, dto }) => {
      const previousLists = await snapshotAndCancel(queryClient, categoryKeys.lists());
      const previousCategoryDetail = queryClient.getQueryData<Category>(categoryKeys.detail(id));
      await queryClient.cancelQueries({ queryKey: categoryKeys.detail(id) });

      const applyPatchToDetailCache = (cachedDetail: Category) =>
        queryClient.setQueryData<Category>(categoryKeys.detail(id), { ...cachedDetail, ...dto });

      updateItemInLists<Category>(queryClient, categoryKeys.lists(), id, dto as Partial<Category>);
      if (previousCategoryDetail) applyPatchToDetailCache(previousCategoryDetail);

      return { previousLists, previousCategoryDetail };
    },
    onError: (err, { id }, context) => {
      if (context?.previousLists) restoreSnapshot(queryClient, context.previousLists);
      if (context?.previousCategoryDetail) queryClient.setQueryData(categoryKeys.detail(id), context.previousCategoryDetail);
      alert.error(resolveErrorMessage(err, t('common.error')));
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(id) });
    },
    onSuccess: () => alert.success(t('common.saved')),
  });
}

export function useArchiveCategory() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => categoriesService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

export function useUnarchiveCategory() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => categoriesService.unarchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation<void, Error, number, CategoryMutationContext>({
    mutationFn: (id) => categoriesService.delete(id),
    onMutate: async (id) => {
      const previousLists = await snapshotAndCancel(queryClient, categoryKeys.lists());
      removeItemFromLists<Category>(queryClient, categoryKeys.lists(), id);
      queryClient.removeQueries({ queryKey: categoryKeys.detail(id) });
      return { previousLists };
    },
    onError: (err, _id, context) => {
      if (context?.previousLists) restoreSnapshot(queryClient, context.previousLists);
      alert.error(resolveErrorMessage(err, t('common.error')));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    onSuccess: () => alert.success(t('common.saved')),
  });
}
