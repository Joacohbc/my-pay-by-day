import { fetchBackendMarkdown, isConvertibleDocument, markdownAttachmentText } from '@/files/markdown.js';

export interface FileInput {
  data: string;
  mediaType: string;
  filename?: string;
  /** Backend file ID (already uploaded/stored) — when present, the display copy of this file part
   * references it instead of embedding the raw content, so the frontend can resolve a real download link. */
  fileId?: number;
  /** Short backend-computed type label (PDF, DOCX, ...) carried through to the display copy. */
  typeLabel?: string;
}

export interface ExtractInput {
  text?: string;
  files?: FileInput[];
  templateId?: number;
}

export type ExtractionUserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mediaType: string }
  | { type: 'file'; data: string; mediaType: string; filename?: string; fileId?: number; typeLabel?: string };

export interface ExtractionUserContent {
  /** Sent to the model — documents needing markdown conversion appear as their converted text so the model can read them. */
  model: ExtractionUserContentPart[];
  /** Persisted to conversation history for human display — documents keep their original file part instead of a raw markdown dump. */
  display: ExtractionUserContentPart[];
}

async function documentMarkdownOf(file: FileInput): Promise<string | null> {
  if (!isConvertibleDocument(file.mediaType) || file.fileId == null) return null;
  return fetchBackendMarkdown(file.fileId);
}

/** Builds the multimodal user content (text/image/converted-markdown) shared by every extraction entry point. */
export async function buildExtractionUserContent(input: ExtractInput): Promise<ExtractionUserContent> {
  const model: ExtractionUserContentPart[] = [];
  const display: ExtractionUserContentPart[] = [];
  if (input.text) {
    model.push({ type: 'text', text: input.text });
    display.push({ type: 'text', text: input.text });
  }
  for (const file of input.files ?? []) {
    if (file.mediaType.startsWith('image/')) {
      const imagePart: ExtractionUserContentPart = { type: 'image', image: file.data, mediaType: file.mediaType };
      model.push(imagePart);
      continue;
    }
    const markdown = await documentMarkdownOf(file);
    const modelFilePart: ExtractionUserContentPart = { type: 'file', data: file.data, mediaType: file.mediaType, filename: file.filename };
    const displayFilePart: ExtractionUserContentPart =
      file.fileId != null
        ? {
            type: 'file',
            data: '',
            mediaType: file.mediaType,
            filename: file.filename,
            fileId: file.fileId,
            ...(file.typeLabel != null ? { typeLabel: file.typeLabel } : {}),
          }
        : modelFilePart;
    if (markdown != null) {
      model.push({ type: 'text', text: markdownAttachmentText(file.filename, markdown) });
    } else {
      model.push(modelFilePart);
    }
    display.push(displayFilePart);
  }
  if (model.length === 0) model.push({ type: 'text', text: 'Extract the event.' });
  if (display.length === 0) display.push({ type: 'text', text: 'Extract the event.' });
  return { model, display };
}
