import type { Category, CreateCategoryDto } from '@/models';
import { api } from '@/services/api';

export const categoriesService = {
  getAll: () => api.get<Category[]>('/categories'),
  getById: (id: number) => api.get<Category>(`/categories/${id}`),
  create: (dto: CreateCategoryDto) => api.post<Category>('/categories', dto),
  update: (id: number, dto: Partial<CreateCategoryDto>) =>
    api.put<Category>(`/categories/${id}`, dto),
  delete: (id: number) => api.delete(`/categories/${id}`),
};
