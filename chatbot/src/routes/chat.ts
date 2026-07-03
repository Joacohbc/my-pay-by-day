import { convertToModelMessages, stepCountIs, streamText, type ModelMessage, type UIMessage } from 'ai';
import { chatGenerationTracker } from './chatGenerationTracker.js';
import { Hono } from 'hono';
import { buildAllTools, toolsForModeWithApproval } from '@/agent/buildTools.js';
import { buildBackgroundTools } from '@/tools/background.js';
import { buildDelegateTools } from '@/tools/delegate.js';
import { config } from '@/config.js';
import { requestContextFrom, type ChatScope } from '@/context.js';
import { groundingNow } from '@/dates.js';
import { buildModelContext, compactIfNeeded } from '@/memory/compaction.js';
import { conversationMemory } from '@/memory/conversation.js';
import { chatTitles } from '@/memory/titles.js';
import { longTermMemory } from '@/memory/longTerm.js';
import { logger } from '@/logging/logger.js';
import { largeModel } from '@/models.js';
import { chatSystemPrompt, type ExecutionMode } from '@/prompts/system.js';
import type { ToolKind } from '@/tools/types.js';

const chatLog = logger.child('chat');
const CHAT_EXECUTION_MODE: ExecutionMode = 'AUTONOMOUS';
/** Tool kinds that require explicit human approval before executing in the interactive chat. */
const CHAT_APPROVAL_KINDS: ReadonlySet<ToolKind> = new Set(['WRITE', 'DRAFT_CONFIRM']);

function toolOutputsByCallId(history: ModelMessage[]): Map<string, unknown> {
  const outputs = new Map<string, unknown>();
  for (const message of history) {
    if (message.role !== 'tool' || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type === 'tool-result' && 'value' in part.output) outputs.set(part.toolCallId, part.output.value);
    }
  }
  return outputs;
}

/** Maps toolCallId -> approvalId for every pending tool-approval-request found in an assistant's history. */
function pendingApprovalsByToolCallId(history: ModelMessage[]): Map<string, string> {
  const pending = new Map<string, string>();
  for (const message of history) {
    if (message.role !== 'assistant' || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type === 'tool-approval-request') pending.set(part.toolCallId, part.approvalId);
    }
  }
  return pending;
}

function isApprovalResponseMessage(message: UIMessage): boolean {
  return message.role === 'assistant' && message.parts.some((part) => 'state' in part && part.state === 'approval-responded');
}

interface ChatBody {
  chatId?: string;
  id?: string;
  messages?: UIMessage[];
  scope?: ChatScope;
  scopeCurrentValues?: string;
}

export const chatRoute = new Hono();

chatRoute.get('/', (c) => {
  const chats = conversationMemory.listAll();
  return c.json(chats);
});

chatRoute.post('/', async (c) => {
  const body = (await c.req.json()) as ChatBody;
  const chatId = body.chatId ?? body.id;
  if (!chatId) return c.json({ error: 'chatId is required' }, 400);
  const ctx = { ...requestContextFrom(c), chatId, scope: body.scope };

  const chatTools = toolsForModeWithApproval(
    buildAllTools(ctx, { ...buildBackgroundTools(ctx), ...buildDelegateTools(ctx, CHAT_EXECUTION_MODE) }),
    CHAT_EXECUTION_MODE,
    CHAT_APPROVAL_KINDS,
  );

  const incoming = body.messages ?? [];
  const userUIMessages = incoming.filter((m) => m.role === 'user');
  const userMessages = await convertToModelMessages(userUIMessages);
  const approvalUIMessages = incoming.filter(isApprovalResponseMessage);

  if (userMessages.length === 0 && approvalUIMessages.length === 0) {
    return c.json({ error: 'a user message or tool approval response is required' }, 400);
  }

  if (userMessages.length > 0) {
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
    conversationMemory.append(chatId, userMessages);
  }

  if (approvalUIMessages.length > 0) {
    // Never trust the client's echoed assistant message wholesale — the tool-call/tool-approval-request
    // it carries is already persisted from the prior turn's onFinish. Extract only the one new fact the
    // client is allowed to report: the approval decision (a 'tool'-role message), and discard the rest.
    let approvedCount = 0;
    let deniedCount = 0;
    for (const approvalMessage of approvalUIMessages) {
      const converted = await convertToModelMessages([approvalMessage], { tools: chatTools });
      const toolMessages = converted.filter((m): m is ModelMessage & { role: 'tool' } => m.role === 'tool');
      conversationMemory.append(chatId, toolMessages);
      for (const part of approvalMessage.parts) {
        if ('state' in part && part.state === 'approval-responded' && 'approval' in part) {
          if (part.approval.approved) approvedCount++;
          else deniedCount++;
        }
      }
    }
    chatLog.info('chat approval response', { chatId, approvedCount, deniedCount });
  }

  await compactIfNeeded(chatId, ctx.lang);
  const modelMessages = buildModelContext(chatId);

  chatGenerationTracker.markGenerationActive(chatId);

  const result = streamText({
    model: largeModel(),
    system: chatSystemPrompt(
      {
        now: groundingNow(ctx.timezone),
        timezone: ctx.timezone,
        lang: ctx.lang,
        memories: longTermMemory.contents(),
      },
      ctx.scope,
      body.scopeCurrentValues,
    ),
    messages: modelMessages,
    tools: chatTools,
    stopWhen: stepCountIs(config.agent.maxSteps),
    onFinish: ({ text, steps }) => {
      chatGenerationTracker.markGenerationComplete(chatId);
      const newMessages = steps.flatMap((s) => s.response.messages);
      conversationMemory.append(chatId, newMessages);
      chatLog.info('chat finished', { chatId, steps: steps.length, reply: text });
      void chatTitles.generateIfMissing(chatId, ctx.lang);
    },
    onError: () => {
      chatGenerationTracker.markGenerationComplete(chatId);
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) =>
      part.type === 'finish' && part.finishReason === 'tool-calls' ? { stoppedByStepLimit: true } : undefined,
  });
});

chatRoute.get('/:chatId', (c) => {
  const chatId = c.req.param('chatId');
  const history = conversationMemory.load(chatId);
  const outputsByCallId = toolOutputsByCallId(history);
  const pendingApprovals = pendingApprovalsByToolCallId(history);
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
            const approvalId = pendingApprovals.get(part.toolCallId);
            const isPendingApproval = approvalId != null && !outputsByCallId.has(part.toolCallId);
            parts.push(
              isPendingApproval
                ? {
                    type: `tool-${part.toolName}`,
                    toolName: part.toolName,
                    toolCallId: part.toolCallId,
                    state: 'approval-requested',
                    input: part.input,
                    approval: { id: approvalId },
                  }
                : {
                    type: `tool-${part.toolName}`,
                    toolName: part.toolName,
                    toolCallId: part.toolCallId,
                    state: 'result',
                    input: part.input,
                    output: outputsByCallId.get(part.toolCallId),
                  },
            );
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

  const lastAssistantMessage = uiMessages.at(-1);
  if (history.at(-1)?.role === 'tool' && lastAssistantMessage?.role === 'assistant') {
    (lastAssistantMessage as { metadata?: { stoppedByStepLimit: boolean } }).metadata = { stoppedByStepLimit: true };
  }

  return c.json(uiMessages);
});

chatRoute.get('/:chatId/status', (c) => {
  const chatId = c.req.param('chatId');
  return c.json({ generating: chatGenerationTracker.isGenerationActive(chatId) });
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
