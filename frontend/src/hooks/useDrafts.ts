import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { draftsService } from '@/services/drafts.service';
import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import type { FinanceEventDraftInputDto } from '@/models';
import { draftKeys } from '@/lib/queryKeys';
import { invalidateDomains } from '@/lib/cacheInvalidation';

export function useFinanceEventDrafts() {
  const query = useQuery({
    queryKey: draftKeys.all,
    queryFn: () => draftsService.getFinanceEventDrafts(),
    select: (data) => data.map(e => ({
      ...e,
      isDraft: true,
    })),
  });

  return {
    ...query,
    data: query.data,
  };
}

export function useFinanceEventDraftByEntityId(entityId: number | null) {
  return useQuery({
    queryKey: draftKeys.byEntity(entityId),
    queryFn: () => (entityId ? draftsService.getFinanceEventDraftByEntityId(entityId) : null),
    enabled: !!entityId,
  });
}

export function useCreateStandaloneFinanceEventDraft() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (dto: FinanceEventDraftInputDto) => draftsService.createStandaloneFinanceEventDraft(dto),
    onSuccess: () => invalidateDomains(qc, ['drafts']),
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUpdateFinanceEventDraftByDraftId() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: FinanceEventDraftInputDto }) =>
      draftsService.updateFinanceEventDraftByDraftId(id, dto),
    onSuccess: () => invalidateDomains(qc, ['drafts']),
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUpsertFinanceEventDraftByEventId() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ eventId, dto }: { eventId: number; dto: FinanceEventDraftInputDto }) =>
      draftsService.upsertFinanceEventDraftByEventId(eventId, dto),
    onSuccess: () => invalidateDomains(qc, ['drafts']),
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => draftsService.delete(id),
    onSuccess: () => invalidateDomains(qc, ['drafts']),
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteAllDrafts() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: () => draftsService.deleteFinanceEventDrafts(),
    onSuccess: () => {
      invalidateDomains(qc, ['drafts']);
      alert.success(t('drafts.allDeleted'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
