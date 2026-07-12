import { api } from '@/services/api';

export interface MemoryEntry {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export const memoryService = {
  list: (): Promise<MemoryEntry[]> => api.get<MemoryEntry[]>('/ai/memory'),

  add: (content: string): Promise<MemoryEntry> => api.post<MemoryEntry>('/ai/memory', { content }),

  update: (id: number, content: string): Promise<void> => api.put<void>(`/ai/memory/${id}`, { content }),

  remove: (id: number): Promise<void> => api.delete(`/ai/memory/${id}`),
};
