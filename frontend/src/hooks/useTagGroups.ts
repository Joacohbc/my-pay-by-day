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
import { tagGroupKeys } from '@/lib/queryKeys';
import { cachePolicy } from '@/lib/cachePolicies';
import { invalidateDomains } from '@/lib/cacheInvalidation';

function resolveErrorMessage(err: unknown, fallbackMessage: string): string {
  return err instanceof Error ? err.message : fallbackMessage;
}

export function useTagGroups(archived?: boolean) {
  return useQuery({
    queryKey: tagGroupKeys.list(archived),
    queryFn: () => tagGroupsService.getAll(archived),
    ...cachePolicy.reference,
  });
}

export function useTagGroup(id: number) {
  return useQuery({
    queryKey: tagGroupKeys.detail(id),
    queryFn: () => tagGroupsService.getById(id),
    enabled: !!id,
    ...cachePolicy.reference,
  });
}

export function useCreateTagGroup() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateTagGroupDto) => tagGroupsService.create(dto),
    onSuccess: () => {
      invalidateDomains(queryClient, ['tagGroups', 'duplicates']);
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
    onSettled: () => {
      invalidateDomains(queryClient, ['tagGroups', 'duplicates']);
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
      invalidateDomains(queryClient, ['tagGroups', 'duplicates']);
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
      invalidateDomains(queryClient, ['tagGroups', 'duplicates']);
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
    onSettled: () => invalidateDomains(queryClient, ['tagGroups', 'duplicates']),
    onSuccess: () => alert.success(t('common.saved')),
  });
}
