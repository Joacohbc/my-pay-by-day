import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { Hono } from 'hono';
import { buildAllTools, toolsForMode } from '../agent/buildTools.js';
import { config } from '../config.js';
import { requestContextFrom } from '../context.js';
import { groundingNow } from '../dates.js';
import { compactIfNeeded } from '../memory/compaction.js';
import { conversationMemory } from '../memory/conversation.js';
import { longTermMemory } from '../memory/longTerm.js';
import { largeModel } from '../models.js';
import { chatSystemPrompt } from '../prompts/system.js';

interface ChatBody {
  chatId?: string;
  id?: string;
  messages?: UIMessage[];
}

export const chatRoute = new Hono();

chatRoute.post('/', async (c) => {
  const ctx = requestContextFrom(c);
  const body = (await c.req.json()) as ChatBody;
  const chatId = body.chatId ?? body.id;
  if (!chatId) return c.json({ error: 'chatId is required' }, 400);

  const incoming = body.messages ?? [];
  const lastUser = [...incoming].reverse().find((m) => m.role === 'user');
  if (!lastUser) return c.json({ error: 'a user message is required' }, 400);

  await compactIfNeeded(chatId, ctx.lang);

  const history = conversationMemory.load(chatId);
  const userMessages = await convertToModelMessages([lastUser]);
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
    tools: toolsForMode(buildAllTools(ctx), 'AUTONOMOUS'),
    stopWhen: stepCountIs(config.agent.maxSteps),
    onFinish: ({ response }) => {
      conversationMemory.append(chatId, response.messages);
    },
  });

  return result.toUIMessageStreamResponse();
});

chatRoute.delete('/:chatId', (c) => {
  conversationMemory.clear(c.req.param('chatId'));
  return c.body(null, 204);
});

chatRoute.post('/:chatId/trim', async (c) => {
  const { textToMatch } = (await c.req.json()) as { textToMatch?: string };
  if (!textToMatch) return c.json({ error: 'textToMatch is required' }, 400);
  conversationMemory.trim(c.req.param('chatId'), textToMatch);
  return c.body(null, 200);
});
