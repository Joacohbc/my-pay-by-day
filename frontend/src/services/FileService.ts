import { api } from '@/services/api';
import type { FileDto, PagedResponse, Base64FileUploadRequestDto } from '@/models';

export const FileService = {
  uploadBase64: async (data: Base64FileUploadRequestDto): Promise<FileDto> => {
    return api.post<FileDto>('/files/base64', data);
  },

  getAll: async (page = 0, size = 20, orphaned?: boolean): Promise<PagedResponse<FileDto>> => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (orphaned !== undefined) {
      params.append('orphaned', String(orphaned));
    }
    return api.get<PagedResponse<FileDto>>(`/files?${params.toString()}`);
  },

  getById: async (id: number): Promise<FileDto> => {
    return api.get<FileDto>(`/files/${id}`);
  },

  delete: async (id: number): Promise<void> => {
    return api.delete(`/files/${id}`);
  },

  getContentUrl: (id: number): string => {
    return `${import.meta.env.VITE_API_URL}/files/${id}/content`;
  }
};
