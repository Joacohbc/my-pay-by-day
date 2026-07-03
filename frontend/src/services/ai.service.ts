import { api } from '@/services/api';

export type AiTextAction =
  | 'GENERATE_NAME'
  | 'GENERATE_DESCRIPTION'
  | 'MERGE_DESCRIPTION'
  | 'SUGGEST_NAME_FROM_SIMILAR'
  | 'SUGGEST_DESCRIPTION_FROM_SIMILAR'
  | 'IMPROVE_TEXT'
  | 'APPLY_INSTRUCTIONS';

export interface AiTextRequest {
  action: AiTextAction;
  context?: string;
  currentValue?: string;
  /** Optional grounding for SUGGEST_*_FROM_SIMILAR: filter similar past events. */
  categoryId?: number;
  amount?: number;
  /** Required for APPLY_INSTRUCTIONS: the user's spoken/typed instruction. */
  instruction?: string;
}

export interface AiTextResponse {
  text: string;
}

export const aiService = {
  generateText: (request: AiTextRequest): Promise<AiTextResponse> =>
    api.post<AiTextResponse>('/ai/text', request),
};
