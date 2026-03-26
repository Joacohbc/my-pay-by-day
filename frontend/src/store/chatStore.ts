import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChatMode = 'query' | 'agent';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: string;
}

interface ChatStoreState {
  chatId: string;
  messages: ChatMessage[];
  mode: ChatMode;
  isClearing: boolean;

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setMode: (mode: ChatMode) => void;
  clearChat: () => void;
  newChat: () => void;
  clearBackendMemory: () => Promise<void>;
}

import { chatService } from '@/services/chatService';

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      chatId: crypto.randomUUID(),
      messages: [],
      mode: 'query' as ChatMode,
      isClearing: false,

      addMessage: (msg) =>
        set((s) => ({
          messages: [
            ...s.messages,
            {
              ...msg,
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            },
          ],
        })),

      setMode: (mode) => set({ mode }),

      clearChat: () => set({ messages: [] }),

      newChat: () =>
        set({
          chatId: crypto.randomUUID(),
          messages: [],
        }),

      clearBackendMemory: async () => {
        const { chatId } = get();
        set({ isClearing: true });
        try {
          await chatService.clearMemory(chatId);
          set({ messages: [] });
        } finally {
          set({ isClearing: false });
        }
      },
    }),
    { name: 'mpbd-chat' }
  )
);
