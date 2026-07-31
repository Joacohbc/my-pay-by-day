import { fetchBackendMarkdown, isConvertibleDocument, markdownAttachmentText } from '@/files/markdown.js';

export interface FileInput {
  /** Backend file ID. Every attachment is a file the backend already stores, so the display copy
   * references it instead of embedding raw content and the frontend resolves a real download link. */
  fileId: number;
  mediaType: string;
  filename?: string;
  /** Short backend-computed type label (PDF, DOCX, ...) carried through to the display copy. */
  typeLabel?: string;
  /** Base64 content, loaded only for media the model reads natively — a convertible document
   * reaches the model as the backend's Markdown conversion instead. */
  data: string;
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
  if (!isConvertibleDocument(file.mediaType)) return null;
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
    const displayFilePart: ExtractionUserContentPart = {
      type: 'file',
      data: '',
      mediaType: file.mediaType,
      filename: file.filename,
      fileId: file.fileId,
      ...(file.typeLabel != null ? { typeLabel: file.typeLabel } : {}),
    };
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
