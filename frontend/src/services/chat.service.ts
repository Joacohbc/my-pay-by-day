import i18n from '@/i18n';
import { BASE_URL } from '@/services/api';
import type { ChatSendParams, ChatResponse } from '@/models/chat';

export const chatService = {
  /**
   * Unified send: always uses multipart/form-data to POST /chat.
   * Images are optional.
   */
  sendMessage: async ({ chatId, message, images }: ChatSendParams): Promise<ChatResponse> => {
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('message', message);
    if (images && images.length > 0) {
      images.forEach(img => formData.append('images', img));
    }

    const lang = i18n.language ?? 'en';

    const res = await fetch(`${BASE_URL}/chat?lang=${lang}`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        errorMessage = body.response ?? body.message ?? body.error ?? errorMessage;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }

    return res.json();
  },

  /**
   * Clears the AI's memory for a specific chatId on the backend.
   */
  clearMemory: async (chatId: string): Promise<void> => {
    await fetch(`${BASE_URL}/chat/${chatId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Trims the AI's memory up to the last user message containing the text.
   */
  trimMemory: async (chatId: string, textToMatch: string): Promise<void> => {
    await fetch(`${BASE_URL}/chat/${chatId}/trim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ textToMatch }),
    });
  },
};
