import { api, BASE_URL } from '@/services/api';
import type {
  Base64FileUploadRequestDto,
  EmailFileDto,
  EmailUploadRequestDto,
  FileDto,
  FileWithEventDto,
  PagedResponse,
} from '@/models';

export const filesService = {
  uploadBase64: async (data: Base64FileUploadRequestDto): Promise<FileDto> => {
    return api.post<FileDto>('/files/base64', data);
  },

  uploadEmail: async (email: EmailUploadRequestDto): Promise<FileDto> => {
    return api.post<FileDto>('/files/emails', email);
  },

  /** Reads an email file back as a structured email, so it can be shown as one instead of as raw JSON. */
  getEmail: async (id: number): Promise<EmailFileDto> => {
    return api.get<EmailFileDto>(`/files/${id}/email`);
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
  },

  getContentAsText: async (id: number): Promise<string> => {
    const response = await fetch(`${BASE_URL}/files/${id}/content/binary`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  },

  getContentAsBase64: async (id: number): Promise<string> => {
    const response = await fetch(`${BASE_URL}/files/${id}/content/base64`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  },

  getContentAsMarkdown: async (id: number): Promise<string | null> => {
    const response = await fetch(`${BASE_URL}/files/${id}/content/markdown`);
    if (response.status === 204) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }
};
