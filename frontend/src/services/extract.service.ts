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

export interface ImagePayload {
  data: string;
  mediaType: string;
}

export const extractService = {
  /** Extract a structured event from an image (and optional template) for pre-filling the EventForm. */
  fromImage: (images: ImagePayload[], templateId?: number): Promise<{ event: ExtractedEvent }> =>
    api.post<{ event: ExtractedEvent }>('/ai/events/from-image', { images, templateId }),

  /** Extract an event from free text (optionally using a template); optionally persist it as a draft. */
  fromText: (text: string, templateId?: number, createDraft = true) =>
    api.post('/ai/extract', { text, templateId, createDraft }),
};
