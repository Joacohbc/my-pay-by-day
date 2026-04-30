import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { chatService } from '@/services/chat.service';
import { audioService } from '@/services/audio.service';
import { filesService } from '@/services/files.service';
import { useChatStore, type ChatMessage } from '@/store/chatStore';
import type { ChatSendParams } from '@/models/chat';
import type { FileDto } from '@/models';

function convertBlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result as string);
    fileReader.onerror = () => reject(new Error('audio_data_url_failed'));
    fileReader.readAsDataURL(blob);
  });
}

export function useChatUI() {
  const { t } = useTranslation();
  const {
    chatId,
    messages,
    isClearing,
    draftFiles,
    setDraftFiles,
    addMessage,
    updateMessage,
    newChat,
    clearBackendMemory,
    trimBackendMemory
  } = useChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMutation = useMutation({
    mutationFn: (params: ChatSendParams) => chatService.sendMessage(params),
    onSuccess: (data) => {
      addMessage({ role: 'assistant', content: data.response });
    },
    onError: (err: Error) => {
      addMessage({ role: 'assistant', content: err.message || t('chat.error') });
    },
  });

  const isPending = sendMutation.isPending;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending, scrollToBottom]);

  const imagePreviewUrls = useMemo(() => {
    return draftFiles.map(f => filesService.getContentUrl(f.id));
  }, [draftFiles]);

  const handleSend = useCallback(async () => {
    const userText = input.trim();
    if (!userText && draftFiles.length === 0) return;

    const currentFiles = [...draftFiles];
    setInput('');
    setDraftFiles([]);

    addMessage({
      role: 'user',
      content: userText || t('chat.imageUploaded'),
      imageUrls: currentFiles.map(f => filesService.getContentUrl(f.id)),
    });

    sendMutation.mutate({
      chatId,
      message: userText,
      fileIds: currentFiles.map(f => f.id)
    });
  }, [input, draftFiles, addMessage, t, setDraftFiles, sendMutation, chatId]);

  const handleAudioRecorded = useCallback(async (audioBlob: Blob) => {
    const recordedAudioUrl = await convertBlobToDataUrl(audioBlob);

    const audioMessageId = addMessage({
      role: 'user',
      content: '',
      audioUrl: recordedAudioUrl,
      audioTranscriptionStatus: 'pending',
    });

    let transcriptionText = '';

    try {
      const transcriptionResponse = await audioService.transcribeRecordedAudio(audioBlob);
      transcriptionText = transcriptionResponse.transcription.trim();
    } catch {
      updateMessage(audioMessageId, { audioTranscriptionStatus: 'failed' });
      throw new Error('transcription_failed');
    }

    if (!transcriptionText) {
      updateMessage(audioMessageId, { audioTranscriptionStatus: 'failed' });
      throw new Error('transcription_failed');
    }

    updateMessage(audioMessageId, {
      content: transcriptionText,
      audioTranscriptionStatus: 'ready',
    });

    sendMutation.mutate({
      chatId,
      message: transcriptionText,
    });
  }, [addMessage, chatId, sendMutation, updateMessage]);

  const handleNewChat = useCallback(() => {
    setDraftFiles([]);
    newChat();
  }, [newChat, setDraftFiles]);

  const handleClearMemory = useCallback(async () => {
    if (window.confirm(t('chat.confirmClearMemory'))) {
      await clearBackendMemory();
    }
  }, [clearBackendMemory, t]);

  const handleEditMessage = useCallback(async (msg: ChatMessage) => {
    setInput(msg.content);
    await trimBackendMemory(msg.content);
  }, [trimBackendMemory]);

  const handleAddFile = (file: FileDto) => {
    setDraftFiles([...draftFiles, file]);
  };

  const handleRemoveFile = (fileId: number) => {
    setDraftFiles(draftFiles.filter((f) => f.id !== fileId));
  };

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
