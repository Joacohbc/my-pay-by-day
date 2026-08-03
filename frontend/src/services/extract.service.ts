import { api } from '@/services/api';
import { buildChatRequestId } from '@/lib/chat/requestId';

export interface ExtractResult {
  type: 'DRAFT';
  draftId: number;
  summary: string;
}

export const extractService = {
  /**
   * Extract an event from free text and/or files (optionally using a template) and always stage it as a
   * draft. Files are referenced by their backend id and must already be uploaded. When `chatId` is
   * provided, the backend also appends the exchange to that conversation's memory so it renders as an
   * inline draft card in the chat.
   */
  fromText: (
    text: string,
    templateId?: number,
    chatId?: string,
    fileIds?: number[],
  ): Promise<ExtractResult> =>
    api.post<ExtractResult>(
      '/ai/extract',
      { text, templateId, chatId, fileIds },
      chatId ? { requestId: buildChatRequestId(chatId) } : undefined,
    ),
};
