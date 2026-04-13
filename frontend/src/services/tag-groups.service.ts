import { api } from '@/services/api';
import type { TagGroup, CreateTagGroupDto, PagedResponse } from '@/models';

export const tagGroupsService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<TagGroup>>('/tag-groups', { params: { page, size } }).then((res) => res.data),

  getById: (id: number) =>
    api.get<TagGroup>(`/tag-groups/${id}`).then((res) => res.data),

  create: (dto: CreateTagGroupDto) =>
    api.post<TagGroup>('/tag-groups', dto).then((res) => res.data),

  update: (id: number, dto: Partial<CreateTagGroupDto>) =>
    api.put<TagGroup>(`/tag-groups/${id}`, dto).then((res) => res.data),

  delete: (id: number) =>
    api.delete(`/tag-groups/${id}`).then((res) => res.data),
};
