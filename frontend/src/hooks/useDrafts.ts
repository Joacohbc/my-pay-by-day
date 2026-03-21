import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { draftsService } from '@/services/drafts.service';
import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import type { CreateEventDto } from '@/models';

export const DRAFTS_KEY = ['drafts'] as const;

export function useFinanceEventDrafts() {
  const query = useQuery({
    queryKey: DRAFTS_KEY,
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

export function useDraft(id: number | null) {
  return useQuery({
    queryKey: [...DRAFTS_KEY, id],
    queryFn: () => (id ? draftsService.getById(id) : null),
    enabled: !!id,
  });
}

export function useCreateFinanceEventDraft() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (dto: Partial<CreateEventDto>) => draftsService.createFinanceEventDraft(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DRAFTS_KEY });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUpdateFinanceEventDraft() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateEventDto> }) =>
      draftsService.updateFinanceEventDraft(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DRAFTS_KEY });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => draftsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DRAFTS_KEY });
      alert.success(t('common.deleted') || t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
