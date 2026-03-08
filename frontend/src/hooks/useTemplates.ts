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
  return useMutation({
    mutationFn: (dto: CreateTemplateDto) => templatesService.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateTemplateDto> }) =>
      templatesService.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => templatesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}
