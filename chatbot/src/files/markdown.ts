import type { ModelMessage } from 'ai';
import { config } from '@/config.js';
import { logger } from '@/logging/logger.js';
import { currentRequestFields } from '@/logging/requestStore.js';

const markdownLog = logger.child('markdown');

/** Correlation headers for internal backend fetches, sourced from the ambient request scope. */
function backendHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'X-Source': 'chatbot' };
  const requestId = currentRequestFields()?.requestId;
  if (typeof requestId === 'string') headers['X-Request-Id'] = requestId;
  return headers;
}

const MODEL_NATIVE_MEDIA_TYPE_PREFIXES = ['image/', 'audio/', 'video/'];
const MODEL_NATIVE_MEDIA_TYPES = new Set(['application/pdf']);

/** True when the model cannot read this media type natively and it must reach the model as Markdown text. */
export function isConvertibleDocument(mediaType: string): boolean {
  if (MODEL_NATIVE_MEDIA_TYPE_PREFIXES.some((prefix) => mediaType.startsWith(prefix))) return false;
  return !MODEL_NATIVE_MEDIA_TYPES.has(mediaType);
}

/** Fetches the Markdown content the Java backend persisted for an uploaded file. Returns null when
 * the file has no Markdown (not convertible, conversion failed at upload) or the backend is unreachable. */
export async function fetchBackendMarkdown(fileId: number): Promise<string | null> {
  try {
    const response = await fetch(`${config.backendUrl}/files/${fileId}/content/markdown`, {
      headers: backendHeaders(),
    });
    if (response.status === 204) return null;
    if (!response.ok) {
      markdownLog.warn('backend markdown fetch failed', { fileId, status: response.status });
      return null;
    }
    const markdown = await response.text();
    return markdown.length > 0 ? markdown : null;
  } catch (e) {
    markdownLog.warn('backend unreachable for markdown fetch', { fileId, error: (e as Error).message });
    return null;
  }
}

export function markdownAttachmentText(filename: string | undefined, markdown: string): string {
  return `Content of the attached document "${filename ?? 'attachment'}" (converted to Markdown):\n\n${markdown}`;
}

async function documentPartAsMarkdownText(part: {
  mediaType: string;
  filename?: string;
  fileId?: number;
}): Promise<{ type: 'text'; text: string }> {
  if (part.fileId != null) {
    const backendMarkdown = await fetchBackendMarkdown(part.fileId);
    if (backendMarkdown != null) return { type: 'text', text: markdownAttachmentText(part.filename, backendMarkdown) };
  }
  return { type: 'text', text: `Attached document "${part.filename ?? 'attachment'}" could not be read.` };
}

/** Replaces document file parts in user messages with the Markdown text the Java backend persisted at
 * upload time (resolved by fileId), so any text-only model can read attachments the provider would
 * otherwise reject (docx, xlsx, pptx, csv, epub, ...). Documents without a resolvable fileId become an
 * explicit "could not be read" note instead of a raw payload the provider would choke on. */
export async function replaceDocumentPartsWithMarkdown(messages: ModelMessage[]): Promise<ModelMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== 'user' || !Array.isArray(message.content)) return message;

      const content = await Promise.all(
        message.content.map(async (part) => {
          if (part.type !== 'file' || !isConvertibleDocument(part.mediaType)) return part;
          return documentPartAsMarkdownText(part as typeof part & { fileId?: number });
        }),
      );

      return { ...message, content } as ModelMessage;
    }),
  );
}
