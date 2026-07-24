import { errorJson } from '@/i18n.js';
import { convertToModelMessages, stepCountIs, streamText, type ModelMessage, type UIMessage } from 'ai';
import { chatGenerationTracker } from './chatGenerationTracker.js';
import { Hono } from 'hono';
import { buildAllTools, toolsForModeWithApproval } from '@/agent/buildTools.js';
import { buildBackgroundTools } from '@/tools/background.js';
import { buildDelegateTools } from '@/tools/delegate.js';
import { buildInteractionTools } from '@/tools/interaction.js';
import { config } from '@/config.js';
import { requestContextFrom, type ChatScope } from '@/context.js';
import { replaceDocumentPartsWithMarkdown } from '@/files/markdown.js';
import { fileRefsOf, reattachFileRefs } from '@/files/fileRefs.js';
import { groundingNow } from '@/dates.js';
import { buildModelContext, compactIfNeeded } from '@/memory/compaction.js';
import { conversationMemory } from '@/memory/conversation.js';
import { sanitizeLeakedToolMarkup } from '@/memory/sanitizeAssistantText.js';
import { toUIParts, type DisplayMessage, type DisplayOverlays, type DisplayPart } from '@/memory/display.js';
import { chatTitles } from '@/memory/titles.js';
import { longTermMemory } from '@/memory/longTerm.js';
import { logger } from '@/logging/logger.js';
import { costOf, logLlmError, logLlmUsage } from '@/logging/llmUsage.js';
import { largeModel } from '@/models.js';
import { chatSystemPrompt, type ExecutionMode } from '@/prompts/system.js';
import { withSseKeepAlive } from '@/routes/sseKeepAlive.js';
import type { ToolKind } from '@/tools/types.js';

const chatLog = logger.child('chat');
const CHAT_EXECUTION_MODE: ExecutionMode = 'AUTONOMOUS';
/** Tool kinds that require explicit human approval before executing in the interactive chat. DRAFT_CONFIRM is
 * intentionally excluded: confirming a draft is exactly the kind of thing the model should check with the user
 * about via askUser (YES_NO) when it's unsure, not something gated by a separate forced approval step. */
const CHAT_APPROVAL_KINDS: ReadonlySet<ToolKind> = new Set(['WRITE', 'ASK_USER']);

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

/**
 * Maps approvalId -> the client-supplied reason for every resolved tool-approval-response found in
 * history. Used to keep askUser's question/answer visible after a page reload — the reason is where
 * the user's answer to an askUser question travels (see prompts/system.ts's ASK_USER_GUIDANCE).
 */
function approvalReasonsByApprovalId(history: ModelMessage[]): Map<string, string> {
  const reasons = new Map<string, string>();
  for (const message of history) {
    if (message.role !== 'tool' || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type === 'tool-approval-response' && typeof part.reason === 'string') {
        reasons.set(part.approvalId, part.reason);
      }
    }
  }
  return reasons;
}

function isApprovalResponseMessage(message: UIMessage): boolean {
  return message.role === 'assistant' && message.parts.some((part) => 'state' in part && part.state === 'approval-responded');
}

function displayOfUserMessage(uiMessage: UIMessage): DisplayMessage {
  const parts: DisplayPart[] = [];
  for (const part of uiMessage.parts) {
    if (part.type === 'text') {
      parts.push({ type: 'text', text: part.text });
    } else if (part.type === 'file') {
      const { fileId, typeLabel } = part as { fileId?: number; typeLabel?: string };
      parts.push({
        type: 'file',
        mediaType: part.mediaType,
        filename: part.filename,
        ...(fileId != null ? { fileId } : { url: part.url }),
        ...(typeLabel != null ? { typeLabel } : {}),
      });
    }
  }
  return { role: 'user', parts };
}

/** Builds the display representation of the assistant messages produced by a generation, pairing each
 * tool call with its display-rich output (for delegateTask that is the full sub-agent result, not the
 * summary that toModelOutput feeds back to the model). Tool-role messages get no display of their own. */
function displaysOfResponseMessages(
  messages: ModelMessage[],
  richOutputsByCallId: Map<string, unknown>,
): (DisplayMessage | null)[] {
  const pendingApprovals = pendingApprovalsByToolCallId(messages);
  return messages.map((message) => {
    if (message.role !== 'assistant' || !Array.isArray(message.content)) return null;
    const parts: DisplayPart[] = [];
    for (const part of message.content) {
      if (part.type === 'text') {
        parts.push({ type: 'text', text: part.text });
      } else if (part.type === 'tool-call') {
        const approvalId = pendingApprovals.get(part.toolCallId);
        const hasOutput = richOutputsByCallId.has(part.toolCallId);
        parts.push({
          type: 'tool',
          toolName: part.toolName,
          toolCallId: part.toolCallId,
          state: approvalId != null && !hasOutput ? 'approval-requested' : 'result',
          input: part.input,
          ...(hasOutput ? { output: richOutputsByCallId.get(part.toolCallId) } : {}),
          ...(approvalId != null ? { approval: { id: approvalId } } : {}),
        });
      }
    }
    return { role: 'assistant', parts };
  });
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
  if (!chatId) return errorJson(c, 'error.chat_id_required', 400);
  const ctx = { ...requestContextFrom(c), chatId, scope: body.scope };
  const log = chatLog.with({ requestId: ctx.requestId, chatId });

  const chatTools = toolsForModeWithApproval(
    buildAllTools(ctx, {
      ...buildBackgroundTools(ctx),
      ...buildDelegateTools(ctx, CHAT_EXECUTION_MODE),
      ...buildInteractionTools(),
    }),
    CHAT_EXECUTION_MODE,
    CHAT_APPROVAL_KINDS,
  );

  const incoming = body.messages ?? [];
  const userUIMessages = incoming.filter((m) => m.role === 'user');
  const userMessages = await convertToModelMessages(userUIMessages);
  const conversionIsOneToOne = userMessages.length === userUIMessages.length;
  if (conversionIsOneToOne) {
    userMessages.forEach((message, index) => reattachFileRefs(message, fileRefsOf(userUIMessages[index])));
  } else if (userUIMessages.length > 0) {
    log.warn('user message conversion is not 1:1, skipping file ref re-attachment', {
      uiCount: userUIMessages.length,
      modelCount: userMessages.length,
    });
  }
  const approvalUIMessages = incoming.filter(isApprovalResponseMessage);

  if (userMessages.length === 0 && approvalUIMessages.length === 0) {
    return errorJson(c, 'error.message_required', 400);
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
    // Prod (INFO) records that a message arrived and its context, never the content; the user's
    // text stays at DEBUG. The request source is already bound to the ambient log scope.
    log.info('chat request', { tz: ctx.timezone, lang: ctx.lang });
    log.debug('chat request text', { user: userText });
    const displays = conversionIsOneToOne ? userUIMessages.map(displayOfUserMessage) : undefined;
    conversationMemory.append(chatId, userMessages, displays);
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
    log.info('chat approval response', { approvedCount, deniedCount });
  }

  await compactIfNeeded(chatId, ctx.lang);
  const modelMessages = await replaceDocumentPartsWithMarkdown(buildModelContext(chatId));

  const abortController = chatGenerationTracker.startGeneration(chatId);
  const generationStartedAt = performance.now();

  // A StepResult's `response.messages` is cumulative (every prior step's messages plus this one's), so
  // slicing from the running count persisted so far yields exactly this step's new messages — letting each
  // step land in conversationMemory as soon as it completes instead of only once the whole call finishes.
  // This is what lets a client that reloads history mid-generation (e.g. after leaving and returning to the
  // chat view) see everything the model has done so far, not just a blank wait until the very end.
  const toolNames = Object.keys(chatTools);
  let persistedMessageCount = 0;
  const persistStep = (stepMessages: readonly ModelMessage[], toolResults: readonly { toolCallId: string; output: unknown }[]) => {
    const newMessages = stepMessages.slice(persistedMessageCount);
    if (newMessages.length === 0) return;
    persistedMessageCount = stepMessages.length;
    sanitizeLeakedToolMarkup(newMessages, toolNames);
    const richOutputsByCallId = new Map<string, unknown>();
    for (const toolResult of toolResults) richOutputsByCallId.set(toolResult.toolCallId, toolResult.output);
    conversationMemory.append(chatId, newMessages, displaysOfResponseMessages(newMessages, richOutputsByCallId));
  };

  const result = streamText({
    model: largeModel(),
    system: chatSystemPrompt(
      {
        now: groundingNow(ctx.timezone),
        timezone: ctx.timezone,
        lang: ctx.lang,
        currency: ctx.currency,
        memories: longTermMemory.contents(),
      },
      ctx.scope,
      body.scopeCurrentValues,
    ),
    messages: modelMessages,
    tools: chatTools,
    stopWhen: stepCountIs(config.agent.maxSteps),
    abortSignal: abortController.signal,
    onStepFinish: (step) => persistStep(step.response.messages, step.toolResults),
    onFinish: ({ text, steps, response, totalUsage, providerMetadata }) => {
      chatGenerationTracker.markGenerationComplete(chatId, abortController);
      const toolCalls = steps.flatMap((step) => step.toolCalls ?? []);
      const tools = [...new Set(toolCalls.map((call) => call.toolName))];
      const durationMs = Math.round(performance.now() - generationStartedAt);
      // Prod (INFO): how many/which tools ran and how long until the answer — never the reply text.
      log.info('chat finished', { steps: steps.length, toolCount: toolCalls.length, tools, durationMs });
      log.debug('chat reply', { reply: text });
      logLlmUsage('chat', response.modelId, durationMs, totalUsage, costOf(providerMetadata), { steps: steps.length });
      void chatTitles.generateIfMissing(chatId, ctx.lang);
    },
    onAbort: () => {
      chatGenerationTracker.markGenerationComplete(chatId, abortController);
      log.info('chat aborted', { durationMs: Math.round(performance.now() - generationStartedAt) });
    },
    onError: ({ error }) => {
      chatGenerationTracker.markGenerationComplete(chatId, abortController);
      const durationMs = Math.round(performance.now() - generationStartedAt);
      log.error('chat stream failed', { durationMs, error: error instanceof Error ? error.message : String(error) });
      logLlmError('chat', config.models.large, durationMs, error);
    },
  });

  // Drive the model stream to completion server-side so the reply is persisted and the generation flag
  // clears even when the client leaves the chat view mid-stream and stops reading the SSE response.
  void result.consumeStream({ onError: () => {} });

  return withSseKeepAlive(
    result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) =>
        part.type === 'finish' && part.finishReason === 'tool-calls' ? { stoppedByStepLimit: true } : undefined,
    }),
  );
});

/** Rebuilds UI parts from a raw ModelMessage — the fallback for rows persisted before display_json existed. */
function reconstructLegacyParts(msg: ModelMessage, overlays: DisplayOverlays): Record<string, unknown>[] {
  const parts: Record<string, unknown>[] = [];
  if (typeof msg.content === 'string') {
    if (msg.content.trim()) {
      parts.push({ type: 'text', text: msg.content });
    }
    return parts;
  }
  if (!Array.isArray(msg.content)) return parts;

  for (const part of msg.content) {
    if (part.type === 'text') {
      if (part.text.trim()) {
        parts.push({ type: 'text', text: part.text });
      }
    } else if (part.type === 'file') {
      const fileId = (part as { fileId?: number }).fileId;
      const inlineDataUrl =
        typeof part.data === 'string' && part.data.startsWith('data:')
          ? part.data
          : `data:${part.mediaType};base64,${part.data}`;
      parts.push({
        type: 'file',
        mediaType: part.mediaType,
        filename: part.filename,
        ...(fileId != null ? { fileId } : { url: inlineDataUrl }),
      });
    } else if (part.type === 'tool-call') {
      const approvalId = overlays.pendingApprovalsByToolCallId.get(part.toolCallId);
      const isPendingApproval = approvalId != null && !overlays.outputsByCallId.has(part.toolCallId);
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
              output: overlays.outputsByCallId.get(part.toolCallId),
              ...(approvalId != null
                ? {
                    approval: {
                      id: approvalId,
                      approved: true,
                      reason: overlays.approvalReasonsByApprovalId.get(approvalId),
                    },
                  }
                : {}),
            },
      );
    }
  }
  return parts;
}

chatRoute.get('/:chatId', (c) => {
  const chatId = c.req.param('chatId');
  const stored = conversationMemory.loadWithDisplay(chatId);
  const history = stored.map((entry) => entry.message);
  const overlays: DisplayOverlays = {
    outputsByCallId: toolOutputsByCallId(history),
    pendingApprovalsByToolCallId: pendingApprovalsByToolCallId(history),
    approvalReasonsByApprovalId: approvalReasonsByApprovalId(history),
  };
  const uiMessages = stored
    .filter(({ message }) => message.role === 'user' || message.role === 'assistant')
    .map(({ message, display }, index) => ({
      id: `${chatId}-${index}`,
      role: message.role as 'user' | 'assistant',
      parts: display != null ? toUIParts(display, overlays) : reconstructLegacyParts(message, overlays),
    }))
    .filter((msg) => msg.parts.length > 0);

  const lastAssistantMessage = uiMessages.at(-1);
  if (history.at(-1)?.role === 'tool' && lastAssistantMessage?.role === 'assistant') {
    (lastAssistantMessage as { metadata?: { stoppedByStepLimit: boolean } }).metadata = { stoppedByStepLimit: true };
  }

  return c.json(uiMessages);
});

chatRoute.get('/:chatId/status', (c) => {
  const chatId = c.req.param('chatId');
  return c.json({
    generating: chatGenerationTracker.isGenerationActive(chatId),
    messageCount: conversationMemory.count(chatId),
    maxMessages: config.agent.maxChatMessages,
  });
});

chatRoute.post('/:chatId/stop', (c) => {
  const aborted = chatGenerationTracker.abortGeneration(c.req.param('chatId'));
  return c.json({ aborted });
});

chatRoute.delete('/:chatId', (c) => {
  const chatId = c.req.param('chatId');
  chatGenerationTracker.abortGeneration(chatId);
  conversationMemory.deleteChat(chatId);
  return c.body(null, 204);
});

chatRoute.post('/:chatId/trim', async (c) => {
  const { textToMatch } = (await c.req.json()) as { textToMatch?: string };
  if (!textToMatch) return errorJson(c, 'error.text_match_required', 400);
  conversationMemory.trim(c.req.param('chatId'), textToMatch);
  return c.body(null, 204);
});
