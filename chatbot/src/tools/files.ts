import { tool } from 'ai';
import { z } from 'zod';
import { BackendError, createApiClient, unwrap, type FileDto } from '@/backend/client.js';
import { lenientBoolean, NumericId } from '@/bot/dto.js';
import { fetchBackendMarkdown } from '@/files/markdown.js';
import type { RequestContext } from '@/context.js';
import { conversationMemory } from '@/memory/conversation.js';
import type { KindedToolSet } from '@/tools/types.js';

async function safe<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof BackendError ? e.message : (e as Error).message;
    return { error: message };
  }
}

interface AttachedFile {
  fileId: number;
  filename?: string;
  mediaType: string;
  typeLabel?: string;
}

/** Every file the user has attached anywhere in this conversation so far, oldest first and
 * deduplicated by fileId — scanned from the full stored history, not just the current turn, since
 * that is the one place a file sent several turns ago is still findable by id. */
function attachedFilesInConversation(chatId: string): AttachedFile[] {
  const files = new Map<number, AttachedFile>();
  for (const message of conversationMemory.load(chatId)) {
    if (message.role !== 'user' || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type !== 'file') continue;
      const { fileId, typeLabel } = part as { fileId?: number; typeLabel?: string };
      if (fileId == null || files.has(fileId)) continue;
      files.set(fileId, { fileId, filename: part.filename, mediaType: part.mediaType, typeLabel });
    }
  }
  return Array.from(files.values());
}

/**
 * Gives the model explicit, queryable access to what a fileId actually is. A file's numeric id
 * never reaches the model as readable text — it only travels as structured bookkeeping the chatbot
 * uses internally (attachedFileIds, reattachFileRefs) — so without this the model has no way to
 * reference an attachment beyond the turn it arrived in, or to say what one contains once it did.
 */
export function buildFileTools(ctx: RequestContext): KindedToolSet {
  const client = createApiClient(ctx);

  return {
    getWorkspaceInfo: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking conversation context...', es: 'Revisando contexto de la conversación...' } },
      tool: tool({
        description:
          'Report what THIS conversation already has in scope: the draft/event open in a form (if any), and every ' +
          'file the user has attached so far anywhere in this chat (fileId, filename, mediaType, typeLabel) — not ' +
          'the whole file library (use listFiles for that). Call this before asking the user to resend a file they ' +
          'already sent earlier, or to check whether a file from earlier in the chat is still attachable by id.',
        inputSchema: z.object({}),
        execute: () =>
          safe(async () => ({
            scope: ctx.scope ?? null,
            attachedFiles: ctx.chatId ? attachedFilesInConversation(ctx.chatId) : [],
          })),
      }),
    },

    listFiles: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Listing uploaded files...', es: 'Listando archivos subidos...' } },
      tool: tool({
        description:
          'List uploaded files with their id, fileName, mimeType, typeLabel, size and isOrphan (true = not yet ' +
          'attached to any event). Use this to find the fileId of an attachment from earlier in the conversation ' +
          'before passing it as fileIds to createDraft/updateDraft/updateEvent, or before reading it with ' +
          'getFileContent. Returns { files, totalMatches, hasMore }.',
        inputSchema: z.object({
          orphaned: lenientBoolean.nullish(),
          page: z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().min(0).default(0)),
        }),
        execute: ({ orphaned, page }) =>
          safe(async () => {
            const size = 20;
            const filesPage = await unwrap(
              client.GET('/files', { params: { query: { orphaned: orphaned ?? undefined, page, size } } }),
            );
            const files = (filesPage.content ?? []) as FileDto[];
            return {
              files,
              totalMatches: filesPage.totalElements ?? files.length,
              hasMore: (filesPage.totalPages ?? 1) > (filesPage.page ?? page) + 1,
            };
          }),
      }),
    },

    getFileContent: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Reading file content...', es: 'Leyendo contenido del archivo...' } },
      tool: tool({
        description:
          'Read the text content of an uploaded file by its fileId, converted to Markdown (works for PDFs and ' +
          'documents). Images/audio/video have no text form and return an error instead — those are only readable ' +
          'when attached natively in the current message, not by fileId. Use listFiles first to find the fileId.',
        inputSchema: z.object({ fileId: NumericId }),
        execute: ({ fileId }) =>
          safe(async () => {
            const markdown = await fetchBackendMarkdown(fileId);
            if (markdown == null) {
              return { fileId, error: 'No text content available for this file (likely an image, audio or video).' };
            }
            return { fileId, markdown };
          }),
      }),
    },
  };
}
