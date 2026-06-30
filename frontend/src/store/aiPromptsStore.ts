import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/idbStorage';

export interface AiPrompts {
  generateName: string;
  generateDescription: string;
  fixNameSpelling: string;
  fixDescriptionSpelling: string;
  mergeDescription: string;
  suggestNameFromSimilar: string;
  suggestDescriptionFromSimilar: string;
}

interface AiPromptsState {
  prompts: AiPrompts;
  setPrompts: (prompts: AiPrompts) => void;
  setPromptForAction: (action: keyof AiPrompts, value: string) => void;
  getPromptForAction: (action: keyof AiPrompts) => string;
}

const DEFAULT_PROMPTS: AiPrompts = {
  generateName: '',
  generateDescription: '',
  fixNameSpelling: '',
  fixDescriptionSpelling: '',
  mergeDescription: '',
  suggestNameFromSimilar: '',
  suggestDescriptionFromSimilar: '',
};

export const useAiPromptsStore = create<AiPromptsState>()(
  persist(
    (set, get) => ({
      prompts: DEFAULT_PROMPTS,
      setPrompts: (prompts) => set({ prompts }),
      setPromptForAction: (action, value) =>
        set((state) => ({
          prompts: { ...state.prompts, [action]: value },
        })),
      getPromptForAction: (action) => get().prompts[action] ?? '',
    }),
    { name: 'mpbd-ai-prompts', storage: createJSONStorage(() => zustandStorage) }
  )
);
