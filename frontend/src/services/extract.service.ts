import { api } from '@/services/api';

export interface FilePayload {
  data: string;
  mediaType: string;
  filename?: string;
}

export interface ExtractResult {
  type: 'DRAFT';
  draftId: number;
  summary: string;
}

export const extractService = {
  /** Convert a document (docx, xlsx, csv, …) to Markdown via the MarkItDown sidecar. Rejects with a
   * non-2xx error when the sidecar is disabled or cannot handle the file. */
  toMarkdown: (file: FilePayload): Promise<{ markdown: string }> =>
    api.post<{ markdown: string }>('/ai/files/markdown', file),

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
