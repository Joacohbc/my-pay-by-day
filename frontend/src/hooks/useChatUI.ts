import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type FileUIPart, type UIMessage } from 'ai';
import { api, BASE_URL } from '@/services/api';
import { chatService } from '@/services/chat.service';
import { audioService } from '@/services/audio.service';
import { extractService, type FilePayload } from '@/services/extract.service';
import { filesService } from '@/services/files.service';
import { useChatStore, type ChatMessage } from '@/store/chatStore';
import { DRAFTS_KEY } from '@/hooks/useDrafts';
import { eventKeys } from '@/hooks/useEvents';
import { tagKeys } from '@/hooks/useTags';
import { categoryKeys } from '@/hooks/useCategories';
import { getUserTimezone } from '@/lib/utils/dateUtils';
import { useSendCountdown } from '@/hooks/useSendCountdown';
import i18n from '@/lib/i18n';
import type { FileDto } from '@/models';

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

async function toFilePayload(file: FileDto): Promise<FilePayload> {
  const response = await fetch(filesService.getContentUrl(file.id));
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return {
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mediaType: file.mimeType || blob.type || 'application/octet-stream',
    filename: file.fileName,
  };
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function imageUrlsOf(message: UIMessage): string[] {
  return message.parts
    .filter((part): part is FileUIPart => part.type === 'file' && (part.mediaType ?? '').startsWith('image/'))
    .map((part) => part.url);
}

function attachmentsOf(message: UIMessage): { url: string; name: string; type: string }[] {
  return message.parts
    .filter((part): part is FileUIPart => part.type === 'file' && !(part.mediaType ?? '').startsWith('image/'))
    .map((part) => {
      // @ts-expect-error - FileUIPart might have name or filename depending on version
      const name = part.filename || part.name || 'File';
      return {
        url: part.url,
        name,
        type: part.mediaType ?? 'application/octet-stream',
      };
    });
}

const PRESERVED_STATES = new Set(['approval-requested', 'approval-responded']);

function toolCallsOf(
  message: UIMessage,
  isFinished: boolean,
): { name: string; state: string; output?: unknown; args?: any; toolCallId?: string; approval?: { id: string; approved?: boolean } }[] {
  return message.parts
    .filter(
      (
        part,
      ): part is UIMessage['parts'][number] & {
        toolName?: string;
        state: string;
        output?: unknown;
        args?: any;
        toolCallId?: string;
        approval?: { id: string; approved?: boolean };
      } => part.type.startsWith('tool-') || part.type === 'dynamic-tool',
    )
    .map((part) => {
      const name = part.toolName || part.type.replace(/^tool-/, '');
      return {
        name,
        state: isFinished && !PRESERVED_STATES.has(part.state) ? 'result' : part.state,
        output: part.output,
        args: part.args,
        toolCallId: part.toolCallId,
        approval: part.approval,
      };
    });
}

function stoppedByStepLimitOf(message: UIMessage): boolean {
  return (message.metadata as { stoppedByStepLimit?: boolean } | undefined)?.stoppedByStepLimit ?? false;
}

function toDisplayMessage(message: UIMessage, isFinished: boolean): ChatMessage {
  return {
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: textOf(message),
    imageUrls: imageUrlsOf(message),
    attachments: attachmentsOf(message),
    toolCalls: toolCallsOf(message, isFinished),
    stoppedByStepLimit: stoppedByStepLimitOf(message),
    timestamp: new Date().toISOString(),
  };
}

function groupMessages(msgs: ChatMessage[]): ChatMessage[] {
  const grouped: ChatMessage[] = [];
  for (const msg of msgs) {
    if (grouped.length > 0 && grouped[grouped.length - 1].role === msg.role) {
      const prev = grouped[grouped.length - 1];
      if (msg.role === 'assistant') {
        if (msg.content.trim()) {
          prev.content = msg.content;
        }
      } else {
        prev.content = [prev.content, msg.content].filter(Boolean).join('\n').trim();
      }
      if (msg.imageUrls) {
        prev.imageUrls = [...(prev.imageUrls || []), ...msg.imageUrls];
      }
      if (msg.attachments) {
        prev.attachments = [...(prev.attachments || []), ...msg.attachments];
      }
      if (msg.toolCalls) {
        prev.toolCalls = [...(prev.toolCalls || []), ...msg.toolCalls];
      }
      if (msg.audioUrl) {
        prev.audioUrl = msg.audioUrl;
      }
      if (msg.audioTranscriptionStatus) {
        prev.audioTranscriptionStatus = msg.audioTranscriptionStatus;
      }
      prev.stoppedByStepLimit = msg.stoppedByStepLimit ?? prev.stoppedByStepLimit;
    } else {
      grouped.push({
        ...msg,
        imageUrls: msg.imageUrls ? [...msg.imageUrls] : undefined,
        attachments: msg.attachments ? [...msg.attachments] : undefined,
        toolCalls: msg.toolCalls ? [...msg.toolCalls] : undefined,
      });
    }
  }
  return grouped;
}

export function useChatUI() {
  const { t } = useTranslation();
  const { chatId, draftFiles, setDraftFiles, newChat, instantDraftMode, toggleInstantDraftMode } = useChatStore();
  const queryClient = useQueryClient();

  const invalidateFinanceCaches = useCallback(() => {
    for (const queryKey of [DRAFTS_KEY, eventKeys.all, tagKeys.all, categoryKeys.all]) {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${BASE_URL}/ai/chat`,
        prepareSendMessagesRequest: ({ messages }) => {
          const lastMessage = messages[messages.length - 1];
          let newMessages: UIMessage[];
          if (lastMessage?.role === 'assistant') {
            // An approval decision mutates the tool part inside this same trailing assistant
            // message (no new user message is appended) — send it as-is instead of trimming
            // it away, or the approval response would be silently dropped.
            newMessages = [lastMessage];
          } else {
            const lastAssistantIndex = [...messages].reverse().findIndex((m) => m.role === 'assistant');
            newMessages = lastAssistantIndex === -1 ? messages : messages.slice(messages.length - lastAssistantIndex);
          }
          return {
            headers: { 'X-Timezone': getUserTimezone(), 'X-Language': i18n.language },
            body: { chatId, messages: newMessages },
          };
        },
      }),
    [chatId],
  );

  const { messages: uiMessages, status, setMessages, sendMessage, stop, addToolApprovalResponse } = useChat({
    id: chatId,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: invalidateFinanceCaches,
  });

  const { countdown, schedule: scheduleSend, sendNow: triggerSendNow, cancel: cancelScheduledSend } = useSendCountdown();

  useEffect(() => {
    cancelScheduledSend();
  }, [chatId, cancelScheduledSend]);

  const [isBackendGenerating, setIsBackendGenerating] = useState(false);

  const reloadHistory = useCallback(async () => {
    const response = await api.get<UIMessage[]>(`/ai/chat/${chatId}`);
    setMessages(response);
  }, [chatId, setMessages]);

  useEffect(() => {
    let active = true;
    let pollingTimer: ReturnType<typeof setTimeout> | null = null;

    const reloadHistorySafely = async () => {
      try {
        await reloadHistory();
      } catch {
        /* history fetch failed — will retry on next poll if generating */
      }
    };

    const pollUntilComplete = async () => {
      if (!active) return;
      try {
        const generating = await chatService.isGenerating(chatId);
        if (!active) return;
        setIsBackendGenerating(generating);
        if (!generating) {
          await reloadHistorySafely();
          invalidateFinanceCaches();
          return;
        }
        pollingTimer = setTimeout(pollUntilComplete, 2000);
      } catch {
        if (active) setIsBackendGenerating(false);
      }
    };

    const initialize = async () => {
      await reloadHistorySafely();
      if (!active) return;
      await pollUntilComplete();
    };

    initialize();

    return () => {
      active = false;
      if (pollingTimer) clearTimeout(pollingTimer);
    };
  }, [chatId, invalidateFinanceCaches, reloadHistory]);

  const [input, setInput] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const isPendingVal = status === 'submitted' || status === 'streaming';
    const rawDisplay = uiMessages.map((msg, idx) => {
      const isLast = idx === uiMessages.length - 1;
      const hasText = textOf(msg).trim().length > 0;
      const isFinished = !isPendingVal || !isLast || hasText;
      return toDisplayMessage(msg, isFinished);
    });

    const filtered = rawDisplay.filter(
      (msg) =>
        msg.content.trim().length > 0 ||
        (msg.imageUrls && msg.imageUrls.length > 0) ||
        (msg.attachments && msg.attachments.length > 0) ||
        (msg.toolCalls && msg.toolCalls.length > 0),
    );
    return groupMessages(filtered);
  }, [uiMessages, status]);
  const isStreamActive = status === 'submitted' || status === 'streaming';
  const isPending = isStreamActive || isBackendGenerating || isExtracting;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending, scrollToBottom]);

  const imagePreviewUrls = useMemo(() => draftFiles.map((f) => filesService.getContentUrl(f.id)), [draftFiles]);

  const handleInstantDraft = useCallback(async () => {
    const userText = input.trim();
    const currentFiles = [...draftFiles];
    if (!userText && currentFiles.length === 0) return;

    setInput('');
    setDraftFiles([]);

    const [uiFileParts, payloadFiles] = await Promise.all([
      Promise.all(currentFiles.map(toFilePart)),
      Promise.all(currentFiles.map(toFilePayload)),
    ]);

    const optimisticMessage: UIMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: 'user',
      parts: [
        ...(userText ? [{ type: 'text' as const, text: userText }] : []),
        ...uiFileParts,
      ],
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setIsExtracting(true);
    try {
      await extractService.fromText(userText, undefined, true, chatId, payloadFiles.length ? payloadFiles : undefined);
      await reloadHistory();
      invalidateFinanceCaches();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setInput(userText);
      setDraftFiles(currentFiles);
    } finally {
      setIsExtracting(false);
    }
  }, [input, draftFiles, setDraftFiles, chatId, setMessages, reloadHistory, invalidateFinanceCaches]);

  const handleSend = useCallback(async () => {
    if (instantDraftMode) {
      await handleInstantDraft();
      return;
    }

    const userText = input.trim();
    if (!userText && draftFiles.length === 0) return;

    const currentFiles = [...draftFiles];
    setInput('');
    setDraftFiles([]);

    const fileParts = await Promise.all(currentFiles.map(toFilePart));
    
    const newMessage: UIMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: 'user',
      parts: [
        ...(userText ? [{ type: 'text' as const, text: userText }] : []),
        ...fileParts,
      ],
    };

    setMessages((prev) => [...prev, newMessage]);
    scheduleSend(() => sendMessage());
  }, [input, draftFiles, setDraftFiles, setMessages, sendMessage, scheduleSend, instantDraftMode, handleInstantDraft]);

  const applyTranscribedText = useCallback(
    (transcription: string) => {
      const text = transcription.trim();
      if (!text) throw new Error('transcription_failed');
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    },
    [setInput],
  );

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

  const handleNewChat = useCallback(() => {
    setDraftFiles([]);
    setMessages([]);
    newChat();
  }, [newChat, setDraftFiles, setMessages]);

  const handleClearMemory = useCallback(async () => {
    if (!window.confirm(t('chat.confirmClearMemory'))) return;
    setIsClearing(true);
    try {
      await chatService.clearMemory(chatId);
      setMessages([]);
    } finally {
      setIsClearing(false);
    }
  }, [chatId, setMessages, t]);

  const handleEditMessage = useCallback(
    async (msg: ChatMessage) => {
      setInput(msg.content);
      await chatService.trimMemory(chatId, msg.content);
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === msg.id);
        return index >= 0 ? prev.slice(0, index) : prev;
      });
    },
    [chatId, setMessages],
  );

  const handleContinue = useCallback(() => {
    sendMessage({ text: t('chat.stepLimit.continueMessage') });
  }, [sendMessage, t]);

  const handleToolApproval = useCallback(
    (approvalId: string, approved: boolean) => {
      addToolApprovalResponse({ id: approvalId, approved });
    },
    [addToolApprovalResponse],
  );

  const handleAddFile = (file: FileDto) => setDraftFiles([...draftFiles, file]);
  const handleRemoveFile = (fileId: number) => setDraftFiles(draftFiles.filter((f) => f.id !== fileId));

  return {
    messages,
    input,
    setInput,
    isPending,
    isClearing,
    isExtracting,
    instantDraftMode,
    toggleInstantDraftMode,
    draftFiles,
    imagePreviewUrls,
    messagesEndRef,
    countdown,
    triggerSendNow,
    stop,
    handleSend,
    handleContinue,
    handleToolApproval,
    handleNewChat,
    handleClearMemory,
    handleEditMessage,
    handleAudioRecorded,
    handleAudioFileSelected,
    handleAddFile,
    handleRemoveFile,
    t,
  };
}
