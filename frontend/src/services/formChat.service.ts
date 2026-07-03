import { api } from '@/services/api';
import type { FilePayload } from '@/services/extract.service';

export type FormPatchEntityType = 'category' | 'tag' | 'node' | 'template';

export interface FormPatchTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface FormChatRequest {
  entityType: FormPatchEntityType;
  currentValues: Record<string, unknown>;
  conversation: FormPatchTurn[];
  message: string;
  files?: FilePayload[];
}

export interface FormChatResponse {
  patch: Record<string, unknown>;
  reply: string;
}

export const formChatService = {
  send: (request: FormChatRequest): Promise<FormChatResponse> => api.post<FormChatResponse>('/ai/form-chat', request),
};
