import { api } from '@/services/api';
import type { TagGroup, CreateTagGroupDto, PagedResponse } from '@/models';

export const tagGroupsService = {
  getAll: (page = 0, size = 20, archived?: boolean) => {
    let url = `/tag-groups?page=${page}&size=${size}`;
    if (archived !== undefined) url += `&archived=${archived}`;
    return api.get<PagedResponse<TagGroup>>(url);
  },

  getById: (id: number) =>
    api.get<TagGroup>(`/tag-groups/${id}`),

  create: (dto: CreateTagGroupDto) =>
    api.post<TagGroup>('/tag-groups', dto),

  update: (id: number, dto: Partial<CreateTagGroupDto>) =>
    api.put<TagGroup>(`/tag-groups/${id}`, dto),

  archive: (id: number) => api.post<void>(`/tag-groups/${id}/archive`, {}),

  unarchive: (id: number) => api.post<void>(`/tag-groups/${id}/unarchive`, {}),

  delete: (id: number) =>
    api.delete<void>(`/tag-groups/${id}`),
};
