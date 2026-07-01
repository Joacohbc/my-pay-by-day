import { tool } from 'ai';
import { z } from 'zod';
import { longTermMemory } from '@/memory/longTerm.js';
import type { KindedToolSet } from '@/tools/types.js';

/** Long-term memory tools (persist across conversations). */
export function buildMemoryTools(): KindedToolSet {
  return {
    saveMemory: {
      kind: 'READ',
      tool: tool({
        description:
          'Remember a durable fact or preference about the user for future conversations (e.g. "main account is BROU checking", "prefers amounts in UYU"). Do not store transient or sensitive data.',
        inputSchema: z.object({ content: z.string().min(1) }),
        execute: async ({ content }) => {
          const row = longTermMemory.add(content);
          return { saved: true, id: row.id };
        },
      }),
    },

    recallMemory: {
      kind: 'READ',
      tool: tool({
        description: 'Recall everything remembered about the user, optionally filtered by a search term.',
        inputSchema: z.object({ query: z.string().nullish() }),
        execute: async ({ query }) => {
          const all = longTermMemory.list();
          const filtered = query
            ? all.filter((m) => m.content.toLowerCase().includes(query.toLowerCase()))
            : all;
          return filtered.map((m) => ({ id: m.id, content: m.content }));
        },
      }),
    },

    forgetMemory: {
      kind: 'READ',
      tool: tool({
        description: 'Delete a remembered fact by its memory ID when it is no longer true.',
        inputSchema: z.object({ id: z.number() }),
        execute: async ({ id }) => {
          longTermMemory.remove(id);
          return { deleted: true };
        },
      }),
    },
  };
}
