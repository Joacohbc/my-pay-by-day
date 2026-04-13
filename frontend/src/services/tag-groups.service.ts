import { api } from '@/services/api';
import type { TagGroup, CreateTagGroupDto, PagedResponse } from '@/models';

export const tagGroupsService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<TagGroup>>(`/tag-groups?page=${page}&size=${size}`),

  getById: (id: number) =>
    api.get<TagGroup>(`/tag-groups/${id}`),

  create: (dto: CreateTagGroupDto) =>
    api.post<TagGroup>('/tag-groups', dto),

  update: (id: number, dto: Partial<CreateTagGroupDto>) =>
    api.put<TagGroup>(`/tag-groups/${id}`, dto),

  delete: (id: number) =>
    api.delete<void>(`/tag-groups/${id}`),
};
