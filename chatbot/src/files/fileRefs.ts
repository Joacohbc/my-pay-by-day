import type { ModelMessage, UIMessage } from 'ai';
import { isConvertibleDocument } from '@/files/markdown.js';

export interface UploadedFileRef {
  fileId?: number;
  typeLabel?: string;
}

/** File identity travels on the incoming UIMessage file parts (fileId/typeLabel added by the frontend),
 * but convertToModelMessages strips unknown fields — so it is captured per message in part order here
 * and re-attached to the converted ModelMessage file parts afterwards. */
export function fileRefsOf(uiMessage: UIMessage): UploadedFileRef[] {
  return uiMessage.parts
    .filter((part) => part.type === 'file')
    .map((part) => {
      const { fileId, typeLabel } = part as { fileId?: number; typeLabel?: string };
      return { fileId, typeLabel };
    });
}

/** Re-attaches backend file IDs to converted file parts and drops the base64 payload of documents the
 * model reads as backend Markdown anyway — images and PDFs keep their inline data for native vision. */
export function reattachFileRefs(message: ModelMessage, refs: UploadedFileRef[]): void {
  if (!Array.isArray(message.content)) return;
  let refIndex = 0;
  for (const part of message.content) {
    if (part.type !== 'file') continue;
    const ref = refs[refIndex++];
    if (ref?.fileId == null) continue;
    (part as { fileId?: number }).fileId = ref.fileId;
    if (isConvertibleDocument(part.mediaType)) (part as { data: unknown }).data = '';
  }
}
