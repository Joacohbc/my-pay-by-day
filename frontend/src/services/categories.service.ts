import type { Category, CreateCategoryDto, PagedResponse } from '@/models';
import { api } from '@/services/api';

export const categoriesService = {
  getAll: (page = 0, size = 20) =>
    api.get<PagedResponse<Category>>(`/categories?page=${page}&size=${size}`),
  getById: (id: number) => api.get<Category>(`/categories/${id}`),
  create: (dto: CreateCategoryDto) => api.post<Category>('/categories', dto),
  update: (id: number, dto: Partial<CreateCategoryDto>) =>
    api.patch<Category>(`/categories/${id}`, dto),
  delete: (id: number) => api.delete(`/categories/${id}`),
};
