import { api } from '@/services/api';

export interface FilePayload {
  data: string;
  mediaType: string;
  filename?: string;
  /** Backend file ID (already uploaded/stored) — lets the persisted chat history reference it directly
   * instead of embedding the raw content, so the frontend can resolve a real, working download link. */
  fileId?: number;
  /** Short backend-computed type label (PDF, DOCX, ...) carried through to the persisted display part. */
  typeLabel?: string;
}

export interface ExtractResult {
  type: 'DRAFT';
  draftId: number;
  summary: string;
}

export const extractService = {
  /**
   * Extract an event from free text and/or files (optionally using a template) and always stage it as a
   * draft. When `chatId` is provided, the backend also appends the exchange to that conversation's memory
   * so it renders as an inline draft card in the chat.
   */
  fromText: (
    text: string,
    templateId?: number,
    chatId?: string,
    files?: FilePayload[],
  ): Promise<ExtractResult> => api.post<ExtractResult>('/ai/extract', { text, templateId, chatId, files }),
};
