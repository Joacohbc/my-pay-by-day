import { api } from '@/services/api';

export interface ExtractedEvent {
  name: string;
  description: string;
  type: 'INBOUND' | 'OUTBOUND' | 'OTHER';
  amount: number;
  sourceNodeId: number | null;
  destinationNodeId: number | null;
  categoryId: number | null;
  tagIds: number[];
  transactionDate: string | null;
  serverTransactionDate: string | null;
}

export interface FilePayload {
  data: string;
  mediaType: string;
  filename?: string;
}

export interface ExtractResult {
  type: 'DRAFT' | 'EXTRACTION';
  event: ExtractedEvent;
  draft?: { id: number };
}

export const extractService = {
  /** Extract a structured event from files (images, PDFs, etc.) for pre-filling the EventForm. */
  fromImage: (files: FilePayload[], templateId?: number): Promise<{ event: ExtractedEvent }> =>
    api.post<{ event: ExtractedEvent }>('/ai/events/from-image', { files, templateId }),

  /** Convert a document (docx, xlsx, csv, …) to Markdown via the MarkItDown sidecar. Rejects with a
   * non-2xx error when the sidecar is disabled or cannot handle the file. */
  toMarkdown: (file: FilePayload): Promise<{ markdown: string }> =>
    api.post<{ markdown: string }>('/ai/files/markdown', file),

  /**
   * Extract an event from free text and/or files (optionally using a template); optionally persist it
   * as a draft. When `chatId` is provided and a draft is created, the backend also appends the exchange
   * to that conversation's memory so it renders as an inline draft card in the chat.
   */
  fromText: (
    text: string,
    templateId?: number,
    createDraft = true,
    chatId?: string,
    files?: FilePayload[],
  ): Promise<ExtractResult> => api.post<ExtractResult>('/ai/extract', { text, templateId, createDraft, chatId, files }),
};
