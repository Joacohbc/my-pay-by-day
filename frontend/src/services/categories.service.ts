import type { Category, CreateCategoryDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export const categoriesService = {
  getAll: (page = 0, size = 20, archived?: boolean) => {
    let url = `/categories?page=${page}&size=${size}`;
    if (archived !== undefined) url += `&archived=${archived}`;
    return api.get<PagedResponse<Category>>(url);
  },
  getById: (id: number) => api.get<Category>(`/categories/${id}`),
  create: (dto: CreateCategoryDto) => api.post<Category>('/categories', dto),
  update: (id: number, dto: Partial<CreateCategoryDto>) =>
    api.put<Category>(`/categories/${id}`, dto),
  archive: (id: number) => api.post<void>(`/categories/${id}/archive`, {}),
  unarchive: (id: number) => api.post<void>(`/categories/${id}/unarchive`, {}),
  delete: (id: number) => api.delete(`/categories/${id}`),
};
