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
import { invalidateDomains } from '@/lib/cacheInvalidation';
import { invalidateForToolResults } from '@/lib/chat/toolInvalidation';
import { getUserTimezone } from '@/lib/utils/dateUtils';
import { useSendCountdown } from '@/hooks/useSendCountdown';
import i18n from '@/lib/i18n';
import type { FileDto } from '@/models';
import { toDisplayMessage, textOf, imageUrlsOf, attachmentsOf } from '@/lib/chat/toDisplayMessage';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('data_url_failed'));
    reader.readAsDataURL(blob);
  });
}

/** Full file part for the chat model: keeps the inline data URL (needed for vision) while also
 * carrying the backend identity (fileId/typeLabel) so the persisted history can reference the real
 * stored file instead of the base64 copy. */
async function toFilePart(file: FileDto): Promise<FileUIPart & { fileId: number; typeLabel?: string }> {
  const response = await fetch(filesService.getContentUrl(file.id));
  const blob = await response.blob();
  return {
    type: 'file',
    mediaType: file.mimeType || blob.type || 'image/jpeg',
    url: await blobToDataUrl(blob),
    filename: file.fileName,
    fileId: file.id,
    typeLabel: file.typeLabel,
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
    fileId: file.id,
    typeLabel: file.typeLabel,
  };
}

/** Builds the optimistic display part for an already-uploaded file, carrying only its file ID —
 * no URL is resolved or stored here, ChatMessage's FileCard resolves everything from the ID alone.
 * Matches the shape the persisted history part gets after reload, so the attachment card doesn't
 * flicker between renderings. */
function toFileRefPart(file: FileDto): Omit<FileUIPart, 'url'> & { fileId: number; typeLabel?: string } {
  return {
    type: 'file',
    mediaType: file.mimeType || 'application/octet-stream',
    filename: file.fileName,
    fileId: file.id,
    typeLabel: file.typeLabel,
  };
}

function toChatDisplayMessage(message: UIMessage, isFinished: boolean): ChatMessage {
  return {
    ...toDisplayMessage(message, isFinished),
    imageUrls: imageUrlsOf(message),
    attachments: attachmentsOf(message),
  };
}

function groupMessages(msgs: ChatMessage[]): ChatMessage[] {
  const grouped: ChatMessage[] = [];
  for (const msg of msgs) {
    if (grouped.length > 0 && grouped[grouped.length - 1].role === msg.role) {
      const prev = grouped[grouped.length - 1];
      if (msg.role === 'assistant') {
        prev.parts = [...prev.parts, ...msg.parts];
        if (msg.content.trim()) {
          prev.content = msg.content;
        }
      } else {
        // User turns keep the historical `\n`-joined content, but `parts` still accumulates every
        // text/file part in order so downstream consumers relying on `parts` stay consistent.
        prev.parts = [...prev.parts, ...msg.parts];
        prev.content = [prev.content, msg.content].filter(Boolean).join('\n').trim();
      }
      prev.toolCalls = prev.parts
        .filter((part): part is Extract<typeof part, { type: 'tool' }> => part.type === 'tool')
        .map((part) => part.call);
      if (msg.imageUrls) {
        prev.imageUrls = [...(prev.imageUrls || []), ...msg.imageUrls];
      }
      if (msg.attachments) {
        prev.attachments = [...(prev.attachments || []), ...msg.attachments];
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
        parts: [...msg.parts],
        toolCalls: [...msg.toolCalls],
        imageUrls: msg.imageUrls ? [...msg.imageUrls] : undefined,
        attachments: msg.attachments ? [...msg.attachments] : undefined,
      });
    }
  }
  return grouped;
}

export function useChatUI() {
  const { t } = useTranslation();
  const { chatId, draftFiles, setDraftFiles, newChat } = useChatStore();
  const queryClient = useQueryClient();

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
    onFinish: ({ message }) => invalidateForToolResults(queryClient, message),
  });

  const { countdown, schedule: scheduleSend, sendNow: triggerSendNow, cancel: cancelScheduledSend } = useSendCountdown();

  useEffect(() => {
    cancelScheduledSend();
  }, [chatId, cancelScheduledSend]);

  const [isBackendGenerating, setIsBackendGenerating] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [maxMessages, setMaxMessages] = useState(0);
  const wasBackendGeneratingRef = useRef(false);

  const reloadHistory = useCallback(async () => {
    const response = await api.get<UIMessage[]>(`/ai/chat/${chatId}`);
    setMessages(response);
    return response;
  }, [chatId, setMessages]);

  useEffect(() => {
    let active = true;
    let pollingTimer: ReturnType<typeof setTimeout> | null = null;

    const reloadHistorySafely = async (): Promise<UIMessage[] | undefined> => {
      try {
        return await reloadHistory();
      } catch {
        return undefined;
      }
    };

    const pollUntilComplete = async () => {
      if (!active) return;
      try {
        const status = await chatService.getStatus(chatId);
        if (!active) return;
        setIsBackendGenerating(status.generating);
        setMessageCount(status.messageCount);
        setMaxMessages(status.maxMessages);
        if (!status.generating) {
          const history = await reloadHistorySafely();
          if (wasBackendGeneratingRef.current) {
            const lastAssistantMessage = history?.findLast((message) => message.role === 'assistant');
            invalidateForToolResults(queryClient, lastAssistantMessage);
          }
          wasBackendGeneratingRef.current = false;
          return;
        }
        wasBackendGeneratingRef.current = true;
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
  }, [chatId, queryClient, reloadHistory]);

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
      return toChatDisplayMessage(msg, isFinished);
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

  const handleQuickCreate = useCallback(async () => {
    const userText = input.trim();
    const currentFiles = [...draftFiles];
    if (!userText && currentFiles.length === 0) return;

    const combinedText = userText ? `${t('chat.quickCreate.prompt')}\n\n${userText}` : t('chat.quickCreate.prompt');

    setInput('');
    setDraftFiles([]);

    const uiFileParts = currentFiles.map(toFileRefPart);
    const payloadFiles = await Promise.all(currentFiles.map(toFilePayload));

    const optimisticMessage: UIMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: 'user',
      parts: [{ type: 'text' as const, text: combinedText }, ...uiFileParts],
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setIsExtracting(true);
    try {
      await extractService.fromText(combinedText, undefined, chatId, payloadFiles.length ? payloadFiles : undefined);
      await reloadHistory();
      invalidateDomains(queryClient, ['drafts', 'events', 'tags', 'categories']);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setInput(userText);
      setDraftFiles(currentFiles);
    } finally {
      setIsExtracting(false);
    }
  }, [input, draftFiles, setDraftFiles, chatId, setMessages, reloadHistory, queryClient, t]);

  const handleSend = useCallback(async () => {
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
  }, [input, draftFiles, setDraftFiles, setMessages, sendMessage, scheduleSend]);

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

  const handleAddFiles = (files: FileDto[]) => setDraftFiles([...draftFiles, ...files]);
  const handleAddFile = (file: FileDto) => handleAddFiles([file]);
  const handleRemoveFiles = (fileIds: number[]) => setDraftFiles(draftFiles.filter((f) => !fileIds.includes(f.id)));
  const handleRemoveFile = (fileId: number) => handleRemoveFiles([fileId]);

  return {
    messages,
    input,
    setInput,
    isPending,
    isClearing,
    isExtracting,
    messageCount,
    maxMessages,
    draftFiles,
    imagePreviewUrls,
    messagesEndRef,
    countdown,
    triggerSendNow,
    stop,
    handleSend,
    handleQuickCreate,
    handleToolApproval,
    handleAskUserAnswer,
    handleNewChat,
    handleClearMemory,
    handleEditMessage,
    handleAudioRecorded,
    handleAudioFileSelected,
    handleAddFile,
    handleAddFiles,
    handleRemoveFile,
    handleRemoveFiles,
    t,
  };
}
