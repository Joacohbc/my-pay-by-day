import { tool } from 'ai';
import { z } from 'zod';
import type { RequestContext } from '@/context.js';
import { conversationMemory, textOf } from '@/memory/conversation.js';
import type { KindedToolSet } from '@/tools/types.js';

const MAX_TURNS_PER_CHAT = 40;
const MAX_TEXT_CHARS_PER_TURN = 1000;

function matchesQuery(haystack: string, query: string | null | undefined): boolean {
  if (!query) return true;
  return haystack.toLowerCase().includes(query.toLowerCase());
}

/**
 * Read-only tools that let the agent look back at the user's other conversations — to recover context
 * the user refers to ("like we discussed last time") without them having to repeat it. The current
 * conversation is excluded (the model already has it in context), and agent-task threads are already
 * filtered out by conversationMemory.listAll.
 */
export function buildConversationTools(ctx: RequestContext): KindedToolSet {
  const currentChatId = ctx.chatId;

  return {
    listPreviousChats: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Looking through past chats...', es: 'Revisando chats anteriores...' } },
      tool: tool({
        description:
          'List the user\'s previous conversations (most recent first), optionally filtered by a search term matched ' +
          'against each chat\'s title and preview. Returns a chatId for each; pass it to readPreviousChat to read that ' +
          'conversation. The current conversation is never included.',
        inputSchema: z.object({ query: z.string().nullish() }),
        execute: async ({ query }) => {
          return conversationMemory
            .listAll()
            .filter((chat) => chat.chatId !== currentChatId)
            .filter((chat) => matchesQuery(`${chat.title ?? ''} ${chat.preview}`, query))
            .map((chat) => ({
              chatId: chat.chatId,
              title: chat.title,
              preview: chat.preview,
              lastMessageAt: chat.lastMessageAt,
              messageCount: chat.messageCount,
            }));
        },
      }),
    },

    readPreviousChat: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Reading a past chat...', es: 'Leyendo un chat anterior...' } },
      tool: tool({
        description:
          'Read the messages of one of the user\'s previous conversations by its chatId (from listPreviousChats). ' +
          'Returns the user and assistant turns as text, most recent last. Use it to recall details the user is ' +
          'referring to from an earlier chat.',
        inputSchema: z.object({ chatId: z.string().min(1) }),
        execute: async ({ chatId }) => {
          if (chatId === currentChatId) {
            return { error: 'That is the current conversation, which you already have in context.' };
          }
          const messages = conversationMemory.load(chatId);
          if (messages.length === 0) {
            return { error: `No conversation found for chatId "${chatId}".` };
          }
          const turns = messages
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .map((message) => ({ role: message.role, text: textOf(message).trim() }))
            .filter((turn) => turn.text.length > 0)
            .map((turn) => ({ role: turn.role, text: turn.text.slice(0, MAX_TEXT_CHARS_PER_TURN) }));
          const truncated = turns.length > MAX_TURNS_PER_CHAT;
          return {
            chatId,
            title: conversationMemory.getTitle(chatId),
            truncated,
            turns: truncated ? turns.slice(turns.length - MAX_TURNS_PER_CHAT) : turns,
          };
        },
      }),
    },
  };
}
