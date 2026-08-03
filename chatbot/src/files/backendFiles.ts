import type { FileInput } from '@/agent/extraction.js';
import { createApiClient, getBackendText, unwrap, type ApiClient } from '@/backend/client.js';
import type { RequestContext } from '@/context.js';
import { isConvertibleDocument } from '@/files/markdown.js';

const FALLBACK_MEDIA_TYPE = 'application/octet-stream';

/**
 * Loads one stored file as an agent attachment. Only media the model reads natively (images, PDFs)
 * needs its bytes: a convertible document reaches the model as the Markdown the backend already
 * holds, so fetching its content here would be downloaded and then thrown away.
 */
async function resolveFile(ctx: RequestContext, client: ApiClient, fileId: number): Promise<FileInput> {
  const file = await unwrap(client.GET('/files/{id}', { params: { path: { id: fileId } } }));
  const mediaType = file.mimeType ?? FALLBACK_MEDIA_TYPE;
  const needsRawContent = !isConvertibleDocument(mediaType);
  return {
    fileId,
    mediaType,
    filename: file.fileName,
    typeLabel: file.typeLabel,
    data: needsRawContent ? await getBackendText(ctx, `/files/${fileId}/content/base64`) : '',
  };
}

/**
 * Resolves the files an AI entry point was given by id into attachments. Attachments are always
 * files the backend already holds — the caller uploads them through `POST /files/base64` first — so
 * the chat history links to a real download and the model reads a document through the backend's
 * Markdown conversion instead of raw bytes.
 *
 * @throws BackendError when a referenced file does not exist or cannot be read
 */
export async function resolveBackendFiles(
  ctx: RequestContext,
  fileIds: number[] | undefined,
): Promise<FileInput[] | undefined> {
  if (!fileIds || fileIds.length === 0) return undefined;
  const client = createApiClient(ctx);
  return Promise.all(fileIds.map((fileId) => resolveFile(ctx, client, fileId)));
}
