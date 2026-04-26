import { api } from '@/services/api';
import type { TagGroup, CreateTagGroupDto } from '@/models';

export const tagGroupsService = {
  getAll: (archived?: boolean) => {
    const url = archived !== undefined ? `/tag-groups?archived=${archived}` : '/tag-groups';
    return api.get<TagGroup[]>(url);
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
