import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type FileUIPart, type UIMessage } from 'ai';
import { api, BASE_URL } from '@/services/api';
import { chatService } from '@/services/chat.service';
import { audioService } from '@/services/audio.service';
import { filesService } from '@/services/files.service';
import { useChatStore, type ChatMessage } from '@/store/chatStore';
import { getUserTimezone } from '@/lib/utils/dateUtils';
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

function toolCallsOf(message: UIMessage, isFinished: boolean): { name: string; state: string; output?: unknown; args?: any }[] {
  return message.parts
    .filter(
      (part): part is UIMessage['parts'][number] & { toolName?: string; state: string; output?: unknown; args?: any } =>
        part.type.startsWith('tool-') || part.type === 'dynamic-tool',
    )
    .map((part) => {
      const name = part.toolName || part.type.replace(/^tool-/, '');
      return {
        name,
        state: isFinished ? 'result' : part.state,
        output: part.output,
        args: part.args,
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
  const { chatId, draftFiles, setDraftFiles, newChat } = useChatStore();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${BASE_URL}/ai/chat`,
        prepareSendMessagesRequest: ({ messages }) => {
          const lastAssistantIndex = [...messages].reverse().findIndex((m) => m.role === 'assistant');
          const newMessages = lastAssistantIndex === -1 
            ? messages 
            : messages.slice(messages.length - lastAssistantIndex);
          return {
            headers: { 'X-Timezone': getUserTimezone(), 'X-Language': i18n.language },
            body: { chatId, messages: newMessages },
          };
        },
      }),
    [chatId],
  );

  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { messages: uiMessages, status, setMessages, sendMessage, stop } = useChat({
    id: chatId,
    transport,
  });

  const triggerSendNow = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    sendMessage();
  }, [sendMessage]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setTimeout(() => {
      setCountdown(null);
    }, 0);
  }, [chatId]);

  const [isBackendGenerating, setIsBackendGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    let pollingTimer: ReturnType<typeof setTimeout> | null = null;

    const reloadHistory = async () => {
      try {
        const response = await api.get<UIMessage[]>(`/ai/chat/${chatId}`);
        if (active) setMessages(response);
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
          await reloadHistory();
          return;
        }
        pollingTimer = setTimeout(pollUntilComplete, 2000);
      } catch {
        if (active) setIsBackendGenerating(false);
      }
    };

    const initialize = async () => {
      await reloadHistory();
      if (!active) return;
      await pollUntilComplete();
    };

    initialize();

    return () => {
      active = false;
      if (pollingTimer) clearTimeout(pollingTimer);
    };
  }, [chatId, setMessages]);

  const [input, setInput] = useState('');
  const [isClearing, setIsClearing] = useState(false);
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
  const isPending = isStreamActive || isBackendGenerating;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending, scrollToBottom]);

  const imagePreviewUrls = useMemo(() => draftFiles.map((f) => filesService.getContentUrl(f.id)), [draftFiles]);

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

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    let timeLeft = 5;
    setCountdown(timeLeft);

    countdownIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
        sendMessage();
      } else {
        setCountdown(timeLeft);
      }
    }, 1000);
  }, [input, draftFiles, setDraftFiles, setMessages, sendMessage]);

  const handleAudioRecorded = useCallback(
    async (audioBlob: Blob) => {
      const { transcription } = await audioService.transcribeRecordedAudio(audioBlob);
      const text = transcription.trim();
      if (!text) throw new Error('transcription_failed');
      
      const newMessage: UIMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: 'user',
        parts: [{ type: 'text', text }],
      };

      setMessages((prev) => [...prev, newMessage]);

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      let timeLeft = 5;
      setCountdown(timeLeft);

      countdownIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdown(null);
          sendMessage();
        } else {
          setCountdown(timeLeft);
        }
      }, 1000);
    },
    [setMessages, sendMessage],
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

  const handleAddFile = (file: FileDto) => setDraftFiles([...draftFiles, file]);
  const handleRemoveFile = (fileId: number) => setDraftFiles(draftFiles.filter((f) => f.id !== fileId));

  return {
    messages,
    input,
    setInput,
    isPending,
    isClearing,
    draftFiles,
    imagePreviewUrls,
    messagesEndRef,
    countdown,
    triggerSendNow,
    stop,
    handleSend,
    handleContinue,
    handleNewChat,
    handleClearMemory,
    handleEditMessage,
    handleAudioRecorded,
    handleAddFile,
    handleRemoveFile,
    t,
  };
}
