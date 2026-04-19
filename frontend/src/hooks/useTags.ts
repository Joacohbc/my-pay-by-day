import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsService } from '@/services/tags.service';
import type { Tag, CreateTagDto } from '@/models';
import {
  type QueriesSnapshot,
  snapshotAndCancel,
  restoreSnapshot,
  updateItemInLists,
  removeItemFromLists,
} from '@/hooks/optimistic';

const FIVE_MINUTES_MS = 1000 * 60 * 5;

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (page: number, size: number, archived?: boolean) => [...tagKeys.lists(), page, size, archived] as const,
  details: () => [...tagKeys.all, 'detail'] as const,
  detail: (id: number) => [...tagKeys.details(), id] as const,
};

export const TAGS_KEY = tagKeys.all;

function resolveErrorMessage(err: unknown, fallbackMessage: string): string {
  return err instanceof Error ? err.message : fallbackMessage;
}

export function useTags(page = 0, size = 20, archived?: boolean) {
  return useQuery({
    queryKey: tagKeys.list(page, size, archived),
    queryFn: () => tagsService.getAll(page, size, archived),
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useTag(id: number) {
  return useQuery({
    queryKey: tagKeys.detail(id),
    queryFn: () => tagsService.getById(id),
    enabled: !!id,
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateTagDto) => tagsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

interface TagMutationContext {
  previousLists?: QueriesSnapshot;
  previousTagDetail?: Tag;
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation<Tag, Error, { id: number; dto: Partial<CreateTagDto> }, TagMutationContext>({
    mutationFn: ({ id, dto }) => tagsService.update(id, dto),
    onMutate: async ({ id, dto }) => {
      const previousLists = await snapshotAndCancel(queryClient, tagKeys.lists());
      const previousTagDetail = queryClient.getQueryData<Tag>(tagKeys.detail(id));
      await queryClient.cancelQueries({ queryKey: tagKeys.detail(id) });

      const applyPatchToDetailCache = (cachedDetail: Tag) =>
        queryClient.setQueryData<Tag>(tagKeys.detail(id), { ...cachedDetail, ...dto });

      updateItemInLists<Tag>(queryClient, tagKeys.lists(), id, dto as Partial<Tag>);
      if (previousTagDetail) applyPatchToDetailCache(previousTagDetail);

      return { previousLists, previousTagDetail };
    },
    onError: (err, { id }, context) => {
      if (context?.previousLists) restoreSnapshot(queryClient, context.previousLists);
      if (context?.previousTagDetail) queryClient.setQueryData(tagKeys.detail(id), context.previousTagDetail);
      alert.error(resolveErrorMessage(err, t('common.error')));
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: tagKeys.detail(id) });
    },
    onSuccess: () => alert.success(t('common.saved')),
  });
}

export function useArchiveTag() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => tagsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

export function useUnarchiveTag() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => tagsService.unarchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation<void, Error, number, TagMutationContext>({
    mutationFn: (id) => tagsService.delete(id),
    onMutate: async (id) => {
      const previousLists = await snapshotAndCancel(queryClient, tagKeys.lists());
      removeItemFromLists<Tag>(queryClient, tagKeys.lists(), id);
      queryClient.removeQueries({ queryKey: tagKeys.detail(id) });
      return { previousLists };
    },
    onError: (err, _id, context) => {
      if (context?.previousLists) restoreSnapshot(queryClient, context.previousLists);
      alert.error(resolveErrorMessage(err, t('common.error')));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
    onSuccess: () => alert.success(t('common.saved')),
  });
}
