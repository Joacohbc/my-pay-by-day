import { api } from '@/services/api';
import { buildChatRequestId } from '@/lib/chat/requestId';

export interface ChatSummary {
  chatId: string;
  title: string | null;
  preview: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface ChatStatus {
  generating: boolean;
  /** Raw conversation_message row count (every user/assistant/tool entry, not just chat turns). */
  messageCount: number;
  maxMessages: number;
}

export const chatService = {
  listChats: async (): Promise<ChatSummary[]> => {
    return api.get<ChatSummary[]>('/ai/chat');
  },

  clearMemory: async (chatId: string): Promise<void> => {
    await api.delete(`/ai/chat/${chatId}`, undefined, { requestId: buildChatRequestId(chatId) });
  },

  trimMemory: async (chatId: string, textToMatch: string): Promise<void> => {
    await api.post(`/ai/chat/${chatId}/trim`, { textToMatch }, { requestId: buildChatRequestId(chatId) });
  },

  getStatus: async (chatId: string): Promise<ChatStatus> => {
    return api.get<ChatStatus>(`/ai/chat/${chatId}/status`, { requestId: buildChatRequestId(chatId) });
  },

  stopGeneration: async (chatId: string): Promise<void> => {
    await api.post(`/ai/chat/${chatId}/stop`, {}, { requestId: buildChatRequestId(chatId) });
  },
};
