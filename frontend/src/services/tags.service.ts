import type { Tag, CreateTagDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export const tagsService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<Tag>>(`/tags?page=${page}&size=${size}`),
  getById: (id: number) => api.get<Tag>(`/tags/${id}`),
  create: (dto: CreateTagDto) => api.post<Tag>('/tags', dto),
  update: (id: number, dto: Partial<CreateTagDto>) =>
    api.patch<Tag>(`/tags/${id}`, dto),
  delete: (id: number) => api.delete(`/tags/${id}`),
};
