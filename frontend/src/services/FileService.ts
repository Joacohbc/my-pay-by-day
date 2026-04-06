import { api, BASE_URL } from '@/services/api';
import type { FileDto, FileWithEventDto, PagedResponse, Base64FileUploadRequestDto } from '@/models';

export const FileService = {
  uploadBase64: async (data: Base64FileUploadRequestDto): Promise<FileDto> => {
    return api.post<FileDto>('/files/base64', data);
  },

  getAll: async (page = 0, size = 20, orphaned?: boolean): Promise<PagedResponse<FileWithEventDto>> => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (orphaned !== undefined) {
      params.append('orphaned', String(orphaned));
    }
    return api.get<PagedResponse<FileWithEventDto>>(`/files?${params.toString()}`);
  },

  getById: async (id: number): Promise<FileDto> => {
    return api.get<FileDto>(`/files/${id}`);
  },

  delete: async (id: number): Promise<void> => {
    return api.delete(`/files/${id}`);
  },

  getContentUrl: (id: number): string => {
    return `${BASE_URL}/files/${id}/content/binary`;
  }
};
