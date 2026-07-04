import { convertFileToMarkdown, markdownAttachmentText, needsMarkdownConversion } from '@/files/markitdown.js';

export interface FileInput {
  data: string;
  mediaType: string;
  filename?: string;
}

export interface ExtractInput {
  text?: string;
  files?: FileInput[];
  templateId?: number;
}

export type ExtractionUserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mediaType: string }
  | { type: 'file'; data: string; mediaType: string; filename?: string };

/** Builds the multimodal user content (text/image/converted-markdown) shared by every extraction entry point. */
export async function buildExtractionUserContent(input: ExtractInput): Promise<ExtractionUserContentPart[]> {
  const userContent: ExtractionUserContentPart[] = [];
  if (input.text) userContent.push({ type: 'text', text: input.text });
  for (const file of input.files ?? []) {
    if (file.mediaType.startsWith('image/')) {
      userContent.push({ type: 'image', image: file.data, mediaType: file.mediaType });
      continue;
    }
    const markdown = needsMarkdownConversion(file.mediaType) ? await convertFileToMarkdown(file) : null;
    if (markdown != null) {
      userContent.push({ type: 'text', text: markdownAttachmentText(file.filename, markdown) });
    } else {
      userContent.push({ type: 'file', data: file.data, mediaType: file.mediaType, filename: file.filename });
    }
  }
  if (userContent.length === 0) userContent.push({ type: 'text', text: 'Extract the event.' });
  return userContent;
}
