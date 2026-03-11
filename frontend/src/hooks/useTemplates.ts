import { useAlert } from '@/contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesService } from '@/services/templates.service';
import type { CreateTemplateDto } from '@/models';

export const TEMPLATES_KEY = ['templates'] as const;

export function useTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: templatesService.getAll,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: CreateTemplateDto) => templatesService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY  });
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
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY  });
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
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY  });
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
