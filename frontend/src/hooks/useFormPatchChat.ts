import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type FileUIPart, type UIMessage } from 'ai';
import { BASE_URL } from '@/services/api';
import { audioService } from '@/services/audio.service';
import { filesService } from '@/services/files.service';
import { getUserTimezone } from '@/lib/utils/dateUtils';
import { getCurrency } from '@/lib/format';
import { useSendCountdown } from '@/hooks/useSendCountdown';
import i18n from '@/lib/i18n';
import type { FileDto } from '@/models';
import { toDisplayMessage, textOf } from '@/lib/chat/toDisplayMessage';

export type FormPatchEntityType = 'category' | 'tag' | 'node' | 'template';

interface UseFormPatchChatParams {
  entityType: FormPatchEntityType;
  getCurrentValues: () => Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
}

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

export function useFormPatchChat({
  entityType,
  getCurrentValues,
  onPatch,
}: UseFormPatchChatParams) {
  const [chatId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState('');
  const [draftFiles, setDraftFiles] = useState<FileDto[]>([]);

  const getCurrentValuesRef = useRef(getCurrentValues);
  useEffect(() => {
    getCurrentValuesRef.current = getCurrentValues;
  }, [getCurrentValues]);

  const prepareSendMessagesRequest = useCallback(
    ({ messages }: { messages: UIMessage[] }) => {
      return {
        headers: { 'X-Timezone': getUserTimezone(), 'X-Language': i18n.language, 'X-Currency': getCurrency(), 'X-Request-Id': crypto.randomUUID() },
        body: {
          entityType,
          messages,
          currentValues: JSON.stringify(getCurrentValuesRef.current()),
        },
      };
    },
    [entityType],
  );

  // DefaultChatTransport only invokes prepareSendMessagesRequest when a message is actually sent, never during render,
  // but the linter can't see into this opaque third-party constructor to confirm that.
  // eslint-disable-next-line react-hooks/refs
  const transport = useMemo(() => new DefaultChatTransport({ api: `${BASE_URL}/ai/form-chat`, prepareSendMessagesRequest }), [prepareSendMessagesRequest]);

  const {
    messages: uiMessages,
    status,
    setMessages,
    sendMessage,
    stop,
  } = useChat({
    id: chatId,
    transport,
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
        if (call.name !== 'patch_form') continue;
        
        if (call.toolCallId && !appliedPatchToolCallIds.current.has(call.toolCallId)) {
          appliedPatchToolCallIds.current.add(call.toolCallId);
          // Only apply the non-null properties dynamically mapped by the tool
          const rawArgs = (call.args ?? {}) as Record<string, unknown>;
          const patch = Object.fromEntries(Object.entries(rawArgs).filter(([, v]) => v !== null && v !== undefined));
          if (Object.keys(patch).length > 0) {
            onPatch(patch);
          }
        }
      }
    }
  }, [messages, onPatch]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && draftFiles.length === 0) return;

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
  }, [input, draftFiles, setMessages, sendMessage, scheduleSend]);

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
    [],
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
    countdown,
    triggerSendNow,
    handleStop: stop,
  };
}
