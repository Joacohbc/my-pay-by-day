import { api } from '@/services/api';

export interface ChatSummary {
  chatId: string;
  title: string | null;
  preview: string;
  lastMessageAt: string;
  messageCount: number;
}

export const chatService = {
  listChats: async (): Promise<ChatSummary[]> => {
    return api.get<ChatSummary[]>('/ai/chat');
  },

  clearMemory: async (chatId: string): Promise<void> => {
    await api.delete(`/ai/chat/${chatId}`);
  },

  trimMemory: async (chatId: string, textToMatch: string): Promise<void> => {
    await api.post(`/ai/chat/${chatId}/trim`, { textToMatch });
  },
};
