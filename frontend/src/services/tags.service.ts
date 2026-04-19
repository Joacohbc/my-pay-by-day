import type { Tag, CreateTagDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export const tagsService = {
  getAll: (page = 0, size = 20, archived?: boolean) => {
    let url = `/tags?page=${page}&size=${size}`;
    if (archived !== undefined) url += `&archived=${archived}`;
    return api.get<PagedResponse<Tag>>(url);
  },
  getById: (id: number) => api.get<Tag>(`/tags/${id}`),
  create: (dto: CreateTagDto) => api.post<Tag>('/tags', dto),
  update: (id: number, dto: Partial<CreateTagDto>) =>
    api.put<Tag>(`/tags/${id}`, dto),
  archive: (id: number) => api.post<void>(`/tags/${id}/archive`, {}),
  unarchive: (id: number) => api.post<void>(`/tags/${id}/unarchive`, {}),
  delete: (id: number) => api.delete(`/tags/${id}`),
};
