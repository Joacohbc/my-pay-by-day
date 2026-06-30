import { api } from '@/services/api';

export const chatService = {
  /** Clears the AI's conversation memory for a specific chatId on the backend. */
  clearMemory: async (chatId: string): Promise<void> => {
    await api.delete(`/ai/chat/${chatId}`);
  },

  /** Trims the AI's memory up to the last user message containing the given text. */
  trimMemory: async (chatId: string, textToMatch: string): Promise<void> => {
    await api.post(`/ai/chat/${chatId}/trim`, { textToMatch });
  },
};
