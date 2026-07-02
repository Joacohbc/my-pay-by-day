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
  toolCalls?: { name: string; state: string; output?: unknown; args?: any }[];
  stoppedByStepLimit?: boolean;
}

interface ChatStoreState {
  chatId: string;
  isClearing: boolean;
  draftFiles: FileDto[];
  showChatList: boolean;

  newChat: () => void;
  selectChat: (chatId: string) => void;
  openChatList: () => void;
  closeChatList: () => void;
  setDraftFiles: (files: FileDto[]) => void;
  setIsClearing: (isClearing: boolean) => void;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set) => ({
      chatId: crypto.randomUUID(),
      isClearing: false,
      draftFiles: [],
      showChatList: true,

      newChat: () =>
        set({
          chatId: crypto.randomUUID(),
          draftFiles: [],
          showChatList: false,
        }),

      selectChat: (chatId) =>
        set({
          chatId,
          draftFiles: [],
          showChatList: false,
        }),

      openChatList: () => set({ showChatList: true }),
      closeChatList: () => set({ showChatList: false }),
      setDraftFiles: (files) => set({ draftFiles: files }),
      setIsClearing: (isClearing) => set({ isClearing }),
    }),
    {
      name: 'mpbd-chat',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        chatId: state.chatId,
        showChatList: state.showChatList,
      }),
    },
  ),
);
