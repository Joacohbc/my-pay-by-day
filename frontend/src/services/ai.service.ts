import { api } from '@/services/api';

export type AiTextAction = 'MERGE_DESCRIPTION';

export interface AiTextRequest {
  action: AiTextAction;
  context?: string;
}

export interface AiTextResponse {
  text: string;
}

export const aiService = {
  generateText: (request: AiTextRequest): Promise<AiTextResponse> =>
    api.post<AiTextResponse>('/ai/text', request),
};
