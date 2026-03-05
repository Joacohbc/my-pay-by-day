import type { Tag, CreateTagDto } from '@/models';
import { api } from './api';

export const tagsService = {
  getAll: () => api.get<Tag[]>('/tags'),
  getById: (id: number) => api.get<Tag>(`/tags/${id}`),
  create: (dto: CreateTagDto) => api.post<Tag>('/tags', dto),
  update: (id: number, dto: Partial<CreateTagDto>) =>
    api.put<Tag>(`/tags/${id}`, dto),
  delete: (id: number) => api.delete(`/tags/${id}`),
};
