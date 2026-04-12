import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/idbStorage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  timestamp: string;
}

interface ChatStoreState {
  chatId: string;
  messages: ChatMessage[];
  isClearing: boolean;
  draftImages: File[];

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  newChat: () => void;
  clearBackendMemory: () => Promise<void>;
  trimBackendMemory: (textToMatch: string) => Promise<void>;
  setDraftImages: (images: File[]) => void;
}

import { chatService } from '@/services/chat.service';

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      chatId: crypto.randomUUID(),
      messages: [],
      isClearing: false,
      draftImages: [],

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

      trimBackendMemory: async (textToMatch: string) => {
        const { chatId, messages } = get();
        set({ isClearing: true });
        try {
          await chatService.trimMemory(chatId, textToMatch);
          // Also trim locally
          const matchIndex = [...messages].reverse().findIndex(m => m.role === 'user' && m.content.includes(textToMatch));
          if (matchIndex !== -1) {
            const actualIndex = messages.length - 1 - matchIndex;
            set({ messages: messages.slice(0, actualIndex) });
          }
        } finally {
          set({ isClearing: false });
        }
      },

      setDraftImages: (images: File[]) => set({ draftImages: images }),
    }),
    {
      name: 'mpbd-chat',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        chatId: state.chatId,
        messages: state.messages
      })
    }
  )
);
