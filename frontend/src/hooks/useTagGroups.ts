import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagGroupsService } from '@/services/tag-groups.service';
import type { TagGroup, CreateTagGroupDto } from '@/models';
import {
  type QueriesSnapshot,
  snapshotAndCancel,
  restoreSnapshot,
  updateItemInLists,
  removeItemFromLists,
} from '@/hooks/optimistic';

const FIVE_MINUTES_MS = 1000 * 60 * 5;

export const tagGroupKeys = {
  all: ['tag-groups'] as const,
  lists: () => [...tagGroupKeys.all, 'list'] as const,
  list: (archived?: boolean) => [...tagGroupKeys.lists(), archived] as const,
  details: () => [...tagGroupKeys.all, 'detail'] as const,
  detail: (id: number) => [...tagGroupKeys.details(), id] as const,
};

function resolveErrorMessage(err: unknown, fallbackMessage: string): string {
  return err instanceof Error ? err.message : fallbackMessage;
}

export function useTagGroups(archived?: boolean) {
  return useQuery({
    queryKey: tagGroupKeys.list(archived),
    queryFn: () => tagGroupsService.getAll(archived),
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useTagGroup(id: number) {
  return useQuery({
    queryKey: tagGroupKeys.detail(id),
    queryFn: () => tagGroupsService.getById(id),
    enabled: !!id,
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCreateTagGroup() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateTagGroupDto) => tagGroupsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagGroupKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

interface TagGroupMutationContext {
  previousLists?: QueriesSnapshot;
  previousTagGroupDetail?: TagGroup;
}

export function useUpdateTagGroup() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation<TagGroup, Error, { id: number; dto: Partial<CreateTagGroupDto> }, TagGroupMutationContext>({
    mutationFn: ({ id, dto }) => tagGroupsService.update(id, dto),
    onMutate: async ({ id, dto }) => {
      const previousLists = await snapshotAndCancel(queryClient, tagGroupKeys.lists());
      const previousTagGroupDetail = queryClient.getQueryData<TagGroup>(tagGroupKeys.detail(id));
      await queryClient.cancelQueries({ queryKey: tagGroupKeys.detail(id) });

      const applyPatchToDetailCache = (cachedDetail: TagGroup) =>
        queryClient.setQueryData<TagGroup>(tagGroupKeys.detail(id), { ...cachedDetail, ...dto });

      updateItemInLists<TagGroup>(queryClient, tagGroupKeys.lists(), id, dto as Partial<TagGroup>);
      if (previousTagGroupDetail) applyPatchToDetailCache(previousTagGroupDetail);

      return { previousLists, previousTagGroupDetail };
    },
    onError: (err, { id }, context) => {
      if (context?.previousLists) restoreSnapshot(queryClient, context.previousLists);
      if (context?.previousTagGroupDetail) queryClient.setQueryData(tagGroupKeys.detail(id), context.previousTagGroupDetail);
      alert.error(resolveErrorMessage(err, t('common.error')));
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: tagGroupKeys.all });
      queryClient.invalidateQueries({ queryKey: tagGroupKeys.detail(id) });
    },
    onSuccess: () => alert.success(t('common.saved')),
  });
}

export function useArchiveTagGroup() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => tagGroupsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagGroupKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

export function useUnarchiveTagGroup() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => tagGroupsService.unarchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagGroupKeys.all });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(resolveErrorMessage(err, t('common.error'))),
  });
}

export function useDeleteTagGroup() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation<void, Error, number, TagGroupMutationContext>({
    mutationFn: (id) => tagGroupsService.delete(id),
    onMutate: async (id) => {
      const previousLists = await snapshotAndCancel(queryClient, tagGroupKeys.lists());
      removeItemFromLists<TagGroup>(queryClient, tagGroupKeys.lists(), id);
      queryClient.removeQueries({ queryKey: tagGroupKeys.detail(id) });
      return { previousLists };
    },
    onError: (err, _id, context) => {
      if (context?.previousLists) restoreSnapshot(queryClient, context.previousLists);
      alert.error(resolveErrorMessage(err, t('common.error')));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: tagGroupKeys.all }),
    onSuccess: () => alert.success(t('common.saved')),
  });
}
