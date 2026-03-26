import i18n from '@/i18n';
import type { ChatSendParams, ChatResponse } from '@/models/chat';

function resolveBaseUrl(): string {
  const runtimeEnv = (window as { __env__?: Record<string, unknown> }).__env__;
  if (runtimeEnv?.VITE_API_BASE_URL
      && typeof runtimeEnv.VITE_API_BASE_URL === 'string'
      && runtimeEnv.VITE_API_BASE_URL !== '') {
    return runtimeEnv.VITE_API_BASE_URL;
  }
  const buildTimeUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof buildTimeUrl === 'string' && buildTimeUrl !== '') {
    return buildTimeUrl;
  }
  return '/api';
}

export const chatService = {
  /**
   * Unified send: always uses multipart/form-data to POST /chat.
   * Image is optional — when absent the backend runs in text-only mode.
   */
  sendMessage: async ({ chatId, message, mode, image }: ChatSendParams): Promise<ChatResponse> => {
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('message', message);
    if (mode) formData.append('mode', mode);
    if (image) formData.append('image', image);

    const BASE_URL = resolveBaseUrl();
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
    const BASE_URL = resolveBaseUrl();
    await fetch(`${BASE_URL}/chat/${chatId}`, {
      method: 'DELETE',
    });
  },
};
