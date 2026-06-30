import { api } from '@/services/api';

export type AiTextAction =
  | 'GENERATE_NAME'
  | 'GENERATE_DESCRIPTION'
  | 'FIX_NAME_SPELLING'
  | 'FIX_DESCRIPTION_SPELLING'
  | 'MERGE_DESCRIPTION'
  | 'SUGGEST_NAME_FROM_SIMILAR'
  | 'SUGGEST_DESCRIPTION_FROM_SIMILAR';

export interface AiTextRequest {
  action: AiTextAction;
  context?: string;
  currentValue?: string;
  customPrompt?: string;
  /** Optional grounding for SUGGEST_*_FROM_SIMILAR: filter similar past events. */
  categoryId?: number;
  amount?: number;
}

export interface AiTextResponse {
  text: string;
}

export const aiService = {
  generateText: (request: AiTextRequest): Promise<AiTextResponse> =>
    api.post<AiTextResponse>('/ai/text', request),
};
