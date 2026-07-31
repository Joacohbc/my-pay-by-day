import type { FileInput } from '@/agent/extraction.js';
import { createApiClient, unwrap, type ApiClient } from '@/backend/client.js';
import type { RequestContext } from '@/context.js';
import { logger } from '@/logging/logger.js';

const uploadLog = logger.child('file-upload');

const DEFAULT_FILE_NAME = 'attachment';

/** Strips the `data:<mediaType>;base64,` prefix a browser-produced data URL carries. */
function base64Of(data: string): string {
  const separator = data.indexOf(',');
  return data.startsWith('data:') && separator >= 0 ? data.slice(separator + 1) : data;
}

function fileNameOf(file: FileInput): string {
  if (file.filename) return file.filename;
  const subtype = file.mediaType.split('/')[1];
  return subtype ? `${DEFAULT_FILE_NAME}.${subtype}` : DEFAULT_FILE_NAME;
}

/** Stores one inline file in the backend so it gains a real, downloadable identity. A failed upload
 * is not fatal: the file keeps its inline base64 content and still reaches the model. */
async function storeInBackend(client: ApiClient, file: FileInput): Promise<FileInput> {
  if (file.fileId != null) return file;
  try {
    const stored = await unwrap(
      client.POST('/files/base64', {
        body: { fileName: fileNameOf(file), mimeType: file.mediaType, base64Content: base64Of(file.data) },
      }),
    );
    if (stored.id == null) return file;
    return { ...file, fileId: stored.id, typeLabel: stored.typeLabel ?? file.typeLabel };
  } catch (e) {
    uploadLog.warn('backend file upload failed, keeping the file inline', {
      mediaType: file.mediaType,
      error: (e as Error).message,
    });
    return file;
  }
}

/**
 * Uploads every inline base64 file to the backend before it is attached to the agent, so a caller
 * that only holds raw content gets what a pre-uploaded file gets: a stored document the chat history
 * can link to, and a Markdown conversion the model reads instead of the raw bytes. Files that already
 * carry a `fileId` are passed through untouched.
 */
export async function storeInlineFiles(
  ctx: RequestContext,
  files: FileInput[] | undefined,
): Promise<FileInput[] | undefined> {
  if (!files || files.length === 0) return files;
  const needsUpload = files.some((file) => file.fileId == null);
  if (!needsUpload) return files;

  const client = createApiClient(ctx);
  return Promise.all(files.map((file) => storeInBackend(client, file)));
}
