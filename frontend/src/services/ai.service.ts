import { api } from '@/services/api';

export type AiTextAction =
  | 'GENERATE_NAME'
  | 'GENERATE_DESCRIPTION'
  | 'FIX_NAME_SPELLING'
  | 'FIX_DESCRIPTION_SPELLING';

export interface AiTextRequest {
  action: AiTextAction;
  context?: string;
  currentValue?: string;
  customPrompt?: string;
}

export interface AiTextResponse {
  text: string;
}

export const aiService = {
  generateText: (request: AiTextRequest): Promise<AiTextResponse> =>
    api.post<AiTextResponse>('/ai/text', request),
};
