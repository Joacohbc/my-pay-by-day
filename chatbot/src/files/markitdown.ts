import type { ModelMessage } from 'ai';
import { config } from '@/config.js';
import { logger } from '@/logging/logger.js';

const markitdownLog = logger.child('markitdown');

const MODEL_NATIVE_MEDIA_TYPE_PREFIXES = ['image/', 'audio/', 'video/'];
const MODEL_NATIVE_MEDIA_TYPES = new Set(['application/pdf']);

export interface ConvertibleFile {
  data: string;
  mediaType: string;
  filename?: string;
}

/** True when the MarkItDown sidecar is configured and the model cannot read this media type natively. */
export function needsMarkdownConversion(mediaType: string): boolean {
  if (config.markitdownUrl === '') return false;
  if (MODEL_NATIVE_MEDIA_TYPE_PREFIXES.some((prefix) => mediaType.startsWith(prefix))) return false;
  return !MODEL_NATIVE_MEDIA_TYPES.has(mediaType);
}

function stripDataUrlPrefix(data: string): string {
  return data.startsWith('data:') ? data.slice(data.indexOf(',') + 1) : data;
}

/** Converts a document to Markdown via the MarkItDown sidecar. Returns null when the sidecar is
 * disabled, rejects the file, or is unreachable — callers fall back to sending the raw file. */
export async function convertFileToMarkdown(file: ConvertibleFile): Promise<string | null> {
  if (config.markitdownUrl === '') return null;
  try {
    const response = await fetch(`${config.markitdownUrl}/convert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        data: stripDataUrlPrefix(file.data),
        mediaType: file.mediaType,
        filename: file.filename,
      }),
    });
    if (!response.ok) {
      const { error } = (await response.json().catch(() => ({ error: response.statusText }))) as { error?: string };
      markitdownLog.warn('conversion rejected', { filename: file.filename, mediaType: file.mediaType, error });
      return null;
    }
    const { markdown } = (await response.json()) as { markdown: string };
    markitdownLog.info('document converted', { filename: file.filename, mediaType: file.mediaType, chars: markdown.length });
    return markdown;
  } catch (e) {
    markitdownLog.warn('markitdown sidecar unreachable', { error: (e as Error).message });
    return null;
  }
}

export function markdownAttachmentText(filename: string | undefined, markdown: string): string {
  return `Content of the attached document "${filename ?? 'attachment'}" (converted to Markdown):\n\n${markdown}`;
}

function fileDataAsBase64(data: unknown): string | null {
  if (typeof data === 'string') return stripDataUrlPrefix(data);
  if (data instanceof Uint8Array) return Buffer.from(data).toString('base64');
  return null;
}

/** Replaces document file parts in user messages with their Markdown text, so any text-only model
 * can read attachments the provider would otherwise reject (docx, xlsx, pptx, csv, epub, ...). */
export async function replaceDocumentPartsWithMarkdown(messages: ModelMessage[]): Promise<ModelMessage[]> {
  if (config.markitdownUrl === '') return messages;

  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== 'user' || !Array.isArray(message.content)) return message;

      const content = await Promise.all(
        message.content.map(async (part) => {
          if (part.type !== 'file' || !needsMarkdownConversion(part.mediaType)) return part;

          const base64 = fileDataAsBase64(part.data);
          if (base64 == null) return part;

          const markdown = await convertFileToMarkdown({
            data: base64,
            mediaType: part.mediaType,
            filename: part.filename,
          });
          if (markdown == null) return part;

          return { type: 'text' as const, text: markdownAttachmentText(part.filename, markdown) };
        }),
      );

      return { ...message, content } as ModelMessage;
    }),
  );
}
