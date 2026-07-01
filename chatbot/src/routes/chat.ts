import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { Hono } from 'hono';
import { buildAllTools, toolsForMode } from '@/agent/buildTools.js';
import { buildBackgroundTools } from '@/tools/background.js';
import { config } from '@/config.js';
import { requestContextFrom } from '@/context.js';
import { groundingNow } from '@/dates.js';
import { compactIfNeeded } from '@/memory/compaction.js';
import { conversationMemory } from '@/memory/conversation.js';
import { chatTitles } from '@/memory/titles.js';
import { longTermMemory } from '@/memory/longTerm.js';
import { logger } from '@/logging/logger.js';
import { largeModel } from '@/models.js';
import { chatSystemPrompt } from '@/prompts/system.js';

const chatLog = logger.child('chat');

interface ChatBody {
  chatId?: string;
  id?: string;
  messages?: UIMessage[];
}

export const chatRoute = new Hono();

chatRoute.get('/', (c) => {
  const chats = conversationMemory.listAll();
  return c.json(chats);
});

chatRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as ChatBody;
  const chatId = body.chatId ?? body.id;
  if (!chatId) return c.json({ error: 'chatId is required' }, 400);

  const incoming = body.messages ?? [];
  const userMessages = await convertToModelMessages(incoming.filter((m) => m.role === 'user'));
  if (userMessages.length === 0) return c.json({ error: 'a user message is required' }, 400);

  const userText = userMessages
    .map((m) => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) {
        return m.content.map((part) => (part.type === 'text' ? part.text : '')).join('');
      }
      return '';
    })
    .join(' ');
  chatLog.info('chat request', { chatId, tz: ctx.timezone, lang: ctx.lang, user: userText });

  await compactIfNeeded(chatId, ctx.lang);

  const history = conversationMemory.load(chatId);
  conversationMemory.append(chatId, userMessages);

  const result = streamText({
    model: largeModel(),
    system: chatSystemPrompt({
      now: groundingNow(ctx.timezone),
      timezone: ctx.timezone,
      lang: ctx.lang,
      memories: longTermMemory.contents(),
    }),
    messages: [...history, ...userMessages],
    tools: toolsForMode(buildAllTools(ctx, buildBackgroundTools(ctx)), 'AUTONOMOUS'),
    stopWhen: stepCountIs(config.agent.maxSteps),
    onFinish: ({ text, steps }) => {
      const newMessages = steps.flatMap((s) => s.response.messages);
      conversationMemory.append(chatId, newMessages);
      chatLog.info('chat finished', { chatId, steps: steps.length, reply: text });
      void chatTitles.generateIfMissing(chatId, ctx.lang);
    },
  });

  return result.toUIMessageStreamResponse();
});

chatRoute.get('/:chatId', (c) => {
  const chatId = c.req.param('chatId');
  const history = conversationMemory.load(chatId);
  const uiMessages = history
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg, index) => {
      const parts: any[] = [];
      if (typeof msg.content === 'string') {
        if (msg.content.trim()) {
          parts.push({ type: 'text', text: msg.content });
        }
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text') {
            if (part.text.trim()) {
              parts.push({ type: 'text', text: part.text });
            }
          } else if (part.type === 'file') {
            parts.push({
              type: 'file',
              mediaType: part.mediaType,
              filename: part.filename,
              url: part.data,
            });
          } else if (part.type === 'tool-call') {
            parts.push({
              type: `tool-${part.toolName}`,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              state: 'result',
              input: part.input,
            });
          }
        }
      }
      return {
        id: `${chatId}-${index}`,
        role: msg.role as 'user' | 'assistant',
        parts,
      };
    })
    .filter((msg) => msg.parts.length > 0);
  return c.json(uiMessages);
});

chatRoute.delete('/:chatId', (c) => {
  conversationMemory.deleteChat(c.req.param('chatId'));
  return c.body(null, 204);
});

chatRoute.post('/:chatId/trim', async (c) => {
  const { textToMatch } = (await c.req.json()) as { textToMatch?: string };
  if (!textToMatch) return c.json({ error: 'textToMatch is required' }, 400);
  conversationMemory.trim(c.req.param('chatId'), textToMatch);
  return c.body(null, 200);
});
