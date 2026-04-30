import { api } from '@/services/api';
import type { ChatSendParams, ChatResponse } from '@/models/chat';

export const chatService = {
  /**
   * Unified send: always uses multipart/form-data to POST /ai/chat.
   * Images are optional.
   */
  sendMessage: async ({ chatId, message, images }: ChatSendParams): Promise<ChatResponse> => {
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('message', message);
    if (images && images.length > 0) {
      images.forEach(img => formData.append('images', img));
    }

    return api.postForm<ChatResponse>('/ai/chat', formData);
  },

  /**
   * Clears the AI's memory for a specific chatId on the backend.
   */
  clearMemory: async (chatId: string): Promise<void> => {
    await api.delete(`/ai/chat/${chatId}`);
  },

  /**
   * Trims the AI's memory up to the last user message containing the text.
   */
  trimMemory: async (chatId: string, textToMatch: string): Promise<void> => {
    await api.post(`/ai/chat/${chatId}/trim`, { textToMatch });
  },
};
