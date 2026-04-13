import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/idbStorage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  audioUrl?: string;
  audioTranscriptionStatus?: 'pending' | 'ready' | 'failed';
  timestamp: string;
}

type ChatMessageDraft = Omit<ChatMessage, 'id' | 'timestamp'>;
type ChatMessageUpdate = Partial<ChatMessageDraft>;

interface ChatStoreState {
  chatId: string;
  messages: ChatMessage[];
  isClearing: boolean;
  draftImages: File[];

  addMessage: (msg: ChatMessageDraft) => string;
  updateMessage: (messageId: string, patch: ChatMessageUpdate) => void;
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

      addMessage: (msg) => {
        const nextMessageId = crypto.randomUUID();

        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...msg,
              id: nextMessageId,
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        return nextMessageId;
      },

      updateMessage: (messageId, patch) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === messageId
              ? { ...message, ...patch }
              : message
          ),
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
