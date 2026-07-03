import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import { formChatService, type FormPatchEntityType, type FormPatchTurn } from '@/services/formChat.service';
import { filesService } from '@/services/files.service';
import { audioService } from '@/services/audio.service';
import { useSendCountdown } from '@/hooks/useSendCountdown';
import type { FileDto } from '@/models';
import type { FilePayload } from '@/services/extract.service';

export interface FormChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface UseFormPatchChatParams {
  entityType: FormPatchEntityType;
  getCurrentValues: () => Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
}

async function toFilePayload(file: FileDto): Promise<FilePayload> {
  const response = await fetch(filesService.getContentUrl(file.id));
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('data_url_failed'));
    reader.readAsDataURL(blob);
  });
  return {
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mediaType: file.mimeType || blob.type || 'application/octet-stream',
    filename: file.fileName,
  };
}

/** Lightweight, non-agentic mini-chat for small forms (Category/Tag/Node/Template): each turn asks the
 * backend for a structured patch of only the fields the user's message changed, applied via onPatch. */
export function useFormPatchChat({ entityType, getCurrentValues, onPatch }: UseFormPatchChatParams) {
  const { t } = useTranslation();
  const alert = useAlert();
  const [messages, setMessages] = useState<FormChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [draftFiles, setDraftFiles] = useState<FileDto[]>([]);
  const [isPending, setIsPending] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { countdown, schedule: scheduleSend, sendNow: triggerSendNow } = useSendCountdown();

  const performSend = useCallback(
    async (text: string, files: FileDto[], userMessage: FormChatMessage) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsPending(true);
      try {
        const conversation: FormPatchTurn[] = messages.map((m) => ({ role: m.role, text: m.text }));
        const filePayloads = await Promise.all(files.map(toFilePayload));
        const { patch, reply } = await formChatService.send(
          {
            entityType,
            currentValues: getCurrentValues(),
            conversation,
            message: text,
            files: filePayloads.length ? filePayloads : undefined,
          },
          controller.signal,
        );
        if (Object.keys(patch).length > 0) onPatch(patch);
        setMessages((prev) => [...prev, { id: `msg-${Date.now()}-a`, role: 'assistant', text: reply }]);
      } catch (error) {
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        setInput(text);
        setDraftFiles(files);
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          alert.error(error instanceof Error ? error.message : t('common.error'));
        }
      } finally {
        abortControllerRef.current = null;
        setIsPending(false);
      }
    },
    [messages, entityType, getCurrentValues, onPatch, alert, t],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text && draftFiles.length === 0) return;

    const files = [...draftFiles];
    setInput('');
    setDraftFiles([]);

    const userMessage: FormChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      text: text || t('ai.chatWidget.attachedFile'),
    };
    setMessages((prev) => [...prev, userMessage]);
    scheduleSend(() => {
      void performSend(text, files, userMessage);
    });
  }, [input, draftFiles, t, scheduleSend, performSend]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

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
    handleAudioFileSelected,
    handleAddFile,
    handleRemoveFile,
    countdown,
    triggerSendNow,
    handleStop,
  };
}
