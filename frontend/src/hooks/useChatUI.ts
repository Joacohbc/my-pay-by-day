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

function toolCallsOf(message: UIMessage, isFinished: boolean): { name: string; state: string }[] {
  return message.parts
    .filter(
      (part): part is UIMessage['parts'][number] & { toolName?: string; state: string } =>
        part.type.startsWith('tool-') || part.type === 'dynamic-tool',
    )
    .map((part) => {
      const name = part.toolName || part.type.replace(/^tool-/, '');
      return {
        name,
        state: isFinished ? 'result' : part.state,
      };
    });
}

function toDisplayMessage(message: UIMessage, isFinished: boolean): ChatMessage {
  return {
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: textOf(message),
    imageUrls: imageUrlsOf(message),
    attachments: attachmentsOf(message),
    toolCalls: toolCallsOf(message, isFinished),
    timestamp: new Date().toISOString(),
  };
}

function groupMessages(msgs: ChatMessage[]): ChatMessage[] {
  const grouped: ChatMessage[] = [];
  for (const msg of msgs) {
    if (grouped.length > 0 && msg.role === 'assistant' && grouped[grouped.length - 1].role === 'assistant') {
      const prev = grouped[grouped.length - 1];
      prev.content = [prev.content, msg.content].filter(Boolean).join('\n\n').trim();
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
        prepareSendMessagesRequest: ({ messages }) => ({
          headers: { 'X-Timezone': getUserTimezone(), 'X-Language': i18n.language },
          body: { chatId, messages: messages.slice(-1) },
        }),
      }),
    [chatId],
  );

  const { messages: uiMessages, sendMessage, status, setMessages } = useChat({
    id: chatId,
    transport,
  });

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        const response = await api.get<UIMessage[]>(`/ai/chat/${chatId}`);
        if (active) {
          setMessages(response);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };
    fetchHistory();
    return () => {
      active = false;
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
  const isPending = status === 'submitted' || status === 'streaming';

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
    if (userText) {
      await sendMessage({ text: userText, files: fileParts });
    } else {
      await sendMessage({ files: fileParts });
    }
  }, [input, draftFiles, setDraftFiles, sendMessage]);

  const handleAudioRecorded = useCallback(
    async (audioBlob: Blob) => {
      const { transcription } = await audioService.transcribeRecordedAudio(audioBlob);
      const text = transcription.trim();
      if (!text) throw new Error('transcription_failed');
      await sendMessage({ text });
    },
    [sendMessage],
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
    handleSend,
    handleNewChat,
    handleClearMemory,
    handleEditMessage,
    handleAudioRecorded,
    handleAddFile,
    handleRemoveFile,
    t,
  };
}
