const STORAGE_KEY = 'ai-prompts';

export interface AiPrompts {
  generateName: string;
  generateDescription: string;
  fixNameSpelling: string;
  fixDescriptionSpelling: string;
}

const DEFAULT_PROMPTS: AiPrompts = {
  generateName: '',
  generateDescription: '',
  fixNameSpelling: '',
  fixDescriptionSpelling: '',
};

function loadPrompts(): AiPrompts {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PROMPTS };
    return { ...DEFAULT_PROMPTS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_PROMPTS };
  }
}

function savePrompts(prompts: AiPrompts): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

export const aiPromptsStore = {
  get: loadPrompts,
  set: (prompts: AiPrompts) => savePrompts(prompts),
  getPromptForAction: (action: keyof AiPrompts): string => {
    const prompts = loadPrompts();
    return prompts[action] ?? '';
  },
};
