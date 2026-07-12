import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesService } from '@/services/templates.service';
import type { CreateTemplateDto } from '@/models';
import { templateKeys } from '@/lib/queryKeys';
import { cachePolicy } from '@/lib/cachePolicies';
import { invalidateDomains } from '@/lib/cacheInvalidation';

export function useTemplates(page = 0, size = 20) {
  return useQuery({
    queryKey: templateKeys.list(page, size),
    queryFn: () => templatesService.getAll(page, size),
    ...cachePolicy.reference,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateTemplateDto) => templatesService.create(dto),
    onSuccess: () => {
      invalidateDomains(qc, ['templates']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateTemplateDto> }) =>
      templatesService.update(id, dto),
    onSuccess: () => {
      invalidateDomains(qc, ['templates']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => templatesService.delete(id),
    onSuccess: () => {
      invalidateDomains(qc, ['templates']);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
