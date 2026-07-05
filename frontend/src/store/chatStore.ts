import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/idbStorage';
import type { FileDto } from '@/models';

export interface ChatToolCall {
  name: string;
  state: string;
  output?: unknown;
  args?: unknown;
  toolCallId?: string;
  approval?: { id: string; approved?: boolean; reason?: string };
}

export type ChatMessagePart =
  | { type: 'text'; text: string }
  | { type: 'tool'; call: ChatToolCall };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** Ordered exactly as the model emitted them — text and tool calls interleaved. */
  parts: ChatMessagePart[];
  /** Derived from `parts` once at conversion time (not a live getter, so it survives object spreads in groupMessages). */
  content: string;
  toolCalls: ChatToolCall[];
  imageUrls?: string[];
  attachments?: { name: string; type: string; fileId?: number; typeLabel?: string }[];
  audioUrl?: string;
  audioTranscriptionStatus?: 'pending' | 'ready' | 'failed';
  timestamp: string;
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
