import type { Template, CreateTemplateDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export const templatesService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<Template>>(`/templates?page=${page}&size=${size}`),
  getById: (id: number) => api.get<Template>(`/templates/${id}`),
  create: (dto: CreateTemplateDto) => api.post<Template>('/templates', dto),
  update: (id: number, dto: Partial<CreateTemplateDto>) =>
    api.patch<Template>(`/templates/${id}`, dto),
  delete: (id: number) => api.delete(`/templates/${id}`),
};
