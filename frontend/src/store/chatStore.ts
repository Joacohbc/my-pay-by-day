import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/idbStorage';
import type { FileDto } from '@/models';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  attachments?: { url: string; name: string; type: string }[];
  audioUrl?: string;
  audioTranscriptionStatus?: 'pending' | 'ready' | 'failed';
  timestamp: string;
  toolCalls?: { name: string; state: string }[];
}

interface ChatStoreState {
  chatId: string;
  isClearing: boolean;
  draftFiles: FileDto[];

  newChat: () => void;
  setDraftFiles: (files: FileDto[]) => void;
  setIsClearing: (isClearing: boolean) => void;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set) => ({
      chatId: crypto.randomUUID(),
      isClearing: false,
      draftFiles: [],

      newChat: () =>
        set({
          chatId: crypto.randomUUID(),
          draftFiles: [],
        }),

      setDraftFiles: (files) => set({ draftFiles: files }),
      setIsClearing: (isClearing) => set({ isClearing }),
    }),
    {
      name: 'mpbd-chat',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        chatId: state.chatId,
      }),
    },
  ),
);
