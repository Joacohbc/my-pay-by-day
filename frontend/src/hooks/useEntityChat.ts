import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type FileUIPart, type UIMessage } from 'ai';
import { BASE_URL } from '@/services/api';
import { audioService } from '@/services/audio.service';
import { filesService } from '@/services/files.service';
import { invalidateDomains } from '@/lib/cacheInvalidation';
import { invalidateForToolResults, domainsForToolName } from '@/lib/chat/toolInvalidation';
import { CHAT_TOOL_MANIFEST } from '@/lib/chat/toolManifest.generated';
import { getUserTimezone } from '@/lib/utils/dateUtils';
import { getCurrency } from '@/lib/format';
import { useSendCountdown } from '@/hooks/useSendCountdown';
import i18n from '@/lib/i18n';
import type { FileDto } from '@/models';
import { toDisplayMessage, textOf } from '@/lib/chat/toDisplayMessage';

export type EntityChatScopeType = 'draft' | 'event';

interface UseEntityChatParams {
  scopeType: EntityChatScopeType;
  /** The draft/event currently open in the form, if one already exists. */
  scopeId: number | undefined;
  /** Text summary of the form's current field values, sent as grounding on every turn. */
  buildContext: () => string;
  /** Creates the scope entity on demand (e.g. bootstraps a draft) when the user chats before touching any field. */
  ensureScopeId?: () => Promise<number>;
  /** Called when the agent creates/targets a scope id the caller didn't know about yet, so it can sync back to the form. */
  onScopeIdResolved?: (id: number) => void;
  /** Called once per createDraft/updateDraft/updateEvent tool call with its raw input fields (name, description,
   * categoryId, tagIds, lineItems, date, ...) so the caller can patch the open form directly —
   * the form does NOT otherwise re-read the draft/event while the page is open, so this is the only way an
   * agent-made edit reaches the on-screen fields. */
  onFieldsPatch?: (patch: Record<string, unknown>) => void;
}

const PATCH_TOOL_NAMES = new Set(
  Object.entries(CHAT_TOOL_MANIFEST)
    .filter(([, meta]) => meta.patchesForm)
    .map(([name]) => name),
);

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('data_url_failed'));
    reader.readAsDataURL(blob);
  });
}

async function toFilePart(file: FileDto): Promise<FileUIPart> {
  const response = await fetch(filesService.getContentUrl(file.id));
  const blob = await response.blob();
  return {
    type: 'file',
    mediaType: file.mimeType || blob.type || 'image/jpeg',
    url: await blobToDataUrl(blob),
    filename: file.fileName,
  };
}

/** Scoped agentic chat for a form's mini-chat widget: same /ai/chat agent as ChatPage, but with its own
 * ephemeral chatId (never the global chatStore singleton) and a scope pointing at the draft/event open on screen. */
export function useEntityChat({
  scopeType,
  scopeId,
  buildContext,
  ensureScopeId,
  onScopeIdResolved,
  onFieldsPatch,
}: UseEntityChatParams) {
  const queryClient = useQueryClient();
  const [chatId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState('');
  const [draftFiles, setDraftFiles] = useState<FileDto[]>([]);
  const resolvedScopeId = useRef(scopeId);
  // prepareSendMessagesRequest below is created once (see the lazy transport ref) and must never go stale,
  // so it reads the latest scope id / context through refs instead of closing over the reactive props directly.
  const buildContextRef = useRef(buildContext);

  useEffect(() => {
    if (scopeId != null) resolvedScopeId.current = scopeId;
  }, [scopeId]);

  useEffect(() => {
    buildContextRef.current = buildContext;
  }, [buildContext]);

  const prepareSendMessagesRequest = useCallback(
    ({ messages }: { messages: UIMessage[] }) => {
      const lastMessage = messages[messages.length - 1];
      let newMessages: UIMessage[];
      if (lastMessage?.role === 'assistant') {
        newMessages = [lastMessage];
      } else {
        const lastAssistantIndex = [...messages].reverse().findIndex((m) => m.role === 'assistant');
        newMessages = lastAssistantIndex === -1 ? messages : messages.slice(messages.length - lastAssistantIndex);
      }
      return {
        headers: { 'X-Timezone': getUserTimezone(), 'X-Language': i18n.language, 'X-Currency': getCurrency(), 'X-Request-Id': crypto.randomUUID(), 'X-Source': 'frontend' },
        body: {
          chatId,
          messages: newMessages,
          scope: resolvedScopeId.current ? { type: scopeType, id: resolvedScopeId.current } : undefined,
          scopeCurrentValues: buildContextRef.current(),
        },
      };
    },
    [chatId, scopeType],
  );

  // prepareSendMessagesRequest reads resolvedScopeId/buildContextRef through refs so it can stay referentially
  // stable for the widget's whole lifetime (deps [chatId, scopeType] only) — those refs are only ever written
  // from effects/handleSend, never during render, so this is safe despite the lint rule's static false positive.
  // eslint-disable-next-line react-hooks/refs
  const transport = useMemo(() => new DefaultChatTransport({ api: `${BASE_URL}/ai/chat`, prepareSendMessagesRequest }), [prepareSendMessagesRequest]);

  const {
    messages: uiMessages,
    status,
    setMessages,
    sendMessage,
    stop,
    addToolApprovalResponse,
  } = useChat({
    id: chatId,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ message }) => invalidateForToolResults(queryClient, message),
  });

  const isPending = status === 'submitted' || status === 'streaming';

  const { countdown, schedule: scheduleSend, sendNow: triggerSendNow } = useSendCountdown();

  const messages = useMemo(() => {
    return uiMessages
      .map((msg, idx) => {
        const isLast = idx === uiMessages.length - 1;
        const isFinished = !isPending || !isLast || textOf(msg).trim().length > 0;
        return toDisplayMessage(msg, isFinished);
      })
      .filter((msg) => msg.content.trim().length > 0 || (msg.toolCalls && msg.toolCalls.length > 0));
  }, [uiMessages, isPending]);

  const appliedPatchToolCallIds = useRef(new Set<string>());

  useEffect(() => {
    for (const message of messages) {
      for (const call of message.toolCalls ?? []) {
        if (!PATCH_TOOL_NAMES.has(call.name) || call.state !== 'result') continue;

        if (onScopeIdResolved && (call.name === 'createDraft' || call.name === 'updateDraft')) {
          const output = call.output as { draftId?: number } | undefined;
          if (output?.draftId && output.draftId !== resolvedScopeId.current) {
            resolvedScopeId.current = output.draftId;
            onScopeIdResolved(output.draftId);
          }
        }

        if (call.toolCallId && !appliedPatchToolCallIds.current.has(call.toolCallId)) {
          appliedPatchToolCallIds.current.add(call.toolCallId);
          onFieldsPatch?.((call.args ?? {}) as Record<string, unknown>);
          // Invalidate right as the write lands, not only once the whole assistant turn finishes — other
          // views (draft list, badges) shouldn't wait on a possibly-longer multi-step turn to catch up.
          invalidateDomains(queryClient, domainsForToolName(call.name));
        }
      }
    }
  }, [messages, onScopeIdResolved, onFieldsPatch, queryClient]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && draftFiles.length === 0) return;

    if (!resolvedScopeId.current && ensureScopeId) {
      resolvedScopeId.current = await ensureScopeId();
    }

    const files = [...draftFiles];
    setInput('');
    setDraftFiles([]);

    const fileParts = await Promise.all(files.map(toFilePart));
    const newMessage: UIMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      role: 'user',
      parts: [...(text ? [{ type: 'text' as const, text }] : []), ...fileParts],
    };
    setMessages((prev) => [...prev, newMessage]);
    scheduleSend(() => sendMessage());
  }, [input, draftFiles, ensureScopeId, setMessages, sendMessage, scheduleSend]);

  const applyTranscribedText = useCallback((transcription: string) => {
    const text = transcription.trim();
    if (!text) throw new Error('transcription_failed');
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  }, []);

  const handleAudioRecorded = useCallback(
    async (audioBlob: Blob) => {
      const { transcription } = await audioService.transcribeRecordedAudio(audioBlob);
      applyTranscribedText(transcription);
    },
    [applyTranscribedText],
  );

  const handleAudioFileSelected = useCallback(
    async (file: File) => {
      const { transcription } = await audioService.transcribeAudio(file);
      applyTranscribedText(transcription);
    },
    [applyTranscribedText],
  );

  const handleAudioRecordedEnhanced = useCallback(
    async (audioBlob: Blob, currentText: string) => {
      const { transcription } = await audioService.transcribeRecordedAudioEnhanced(audioBlob, currentText);
      const editedText = transcription.trim();
      if (!editedText) throw new Error('transcription_failed');
      setInput(editedText);
    },
    [setInput],
  );

  const handleToolApproval = useCallback(
    (approvalId: string, approved: boolean) => {
      addToolApprovalResponse({ id: approvalId, approved });
    },
    [addToolApprovalResponse],
  );

  const handleAskUserAnswer = useCallback(
    (approvalId: string, answer: string) => {
      addToolApprovalResponse({ id: approvalId, approved: true, reason: answer });
    },
    [addToolApprovalResponse],
  );

  const handleAddFile = (file: FileDto) => setDraftFiles((prev) => [...prev, file]);
  const handleRemoveFile = (fileId: number) => setDraftFiles((prev) => prev.filter((f) => f.id !== fileId));

  return {
    messages,
    input,
    setInput,
    isPending,
    draftFiles,
    handleSend,
    handleAudioRecorded,
    handleAudioRecordedEnhanced,
    handleAudioFileSelected,
    handleAddFile,
    handleRemoveFile,
    handleToolApproval,
    handleAskUserAnswer,
    countdown,
    triggerSendNow,
    handleStop: stop,
  };
}
