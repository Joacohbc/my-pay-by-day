import { api } from '@/services/api';
import type { ChatRequest, ChatResponse } from '@/models/chat';

export const chatService = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    return api.post<ChatResponse>('/chat', request);
  },
};
