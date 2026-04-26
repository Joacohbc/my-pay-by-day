import type { Category, CreateCategoryDto } from '@/models';
import { api } from '@/services/api';

export const categoriesService = {
  getAll: (archived?: boolean) => {
    const url = archived !== undefined ? `/categories?archived=${archived}` : '/categories';
    return api.get<Category[]>(url);
  },
  getById: (id: number) => api.get<Category>(`/categories/${id}`),
  create: (dto: CreateCategoryDto) => api.post<Category>('/categories', dto),
  update: (id: number, dto: Partial<CreateCategoryDto>) =>
    api.put<Category>(`/categories/${id}`, dto),
  archive: (id: number) => api.post<void>(`/categories/${id}/archive`, {}),
  unarchive: (id: number) => api.post<void>(`/categories/${id}/unarchive`, {}),
  delete: (id: number) => api.delete(`/categories/${id}`),
};
