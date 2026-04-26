import type { Tag, CreateTagDto } from '@/models';
import { api } from '@/services/api';

export const tagsService = {
  getAll: (archived?: boolean) => {
    const url = archived !== undefined ? `/tags?archived=${archived}` : '/tags';
    return api.get<Tag[]>(url);
  },
  getById: (id: number) => api.get<Tag>(`/tags/${id}`),
  create: (dto: CreateTagDto) => api.post<Tag>('/tags', dto),
  update: (id: number, dto: Partial<CreateTagDto>) =>
    api.put<Tag>(`/tags/${id}`, dto),
  archive: (id: number) => api.post<void>(`/tags/${id}/archive`, {}),
  unarchive: (id: number) => api.post<void>(`/tags/${id}/unarchive`, {}),
  delete: (id: number) => api.delete(`/tags/${id}`),
};
