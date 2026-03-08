import type { Template, CreateTemplateDto } from '@/models';
import { api } from '@/services/api';

export const templatesService = {
  getAll: () => api.get<Template[]>('/templates'),
  getById: (id: number) => api.get<Template>(`/templates/${id}`),
  create: (dto: CreateTemplateDto) => api.post<Template>('/templates', dto),
  update: (id: number, dto: Partial<CreateTemplateDto>) =>
    api.put<Template>(`/templates/${id}`, dto),
  delete: (id: number) => api.delete(`/templates/${id}`),
};
