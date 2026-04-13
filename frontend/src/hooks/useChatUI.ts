import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { chatService } from '@/services/chat.service';
import { audioService } from '@/services/audio.service';
import { convertAudioBlobToWav } from '@/lib/audioWav';
import { useChatStore, type ChatMessage } from '@/store/chatStore';
import type { ChatSendParams } from '@/models/chat';

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
    draftImages,
    setDraftImages,
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
    onError: () => {
      addMessage({ role: 'assistant', content: t('chat.error') });
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
    return draftImages.map(f => URL.createObjectURL(f));
  }, [draftImages]);

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [imagePreviewUrls]);

  const handleSend = useCallback(async () => {
    const userText = input.trim();
    if (!userText && draftImages.length === 0) return;

    const currentImages = [...draftImages];
    setInput('');
    setDraftImages([]);

    let base64Urls: string[] | undefined;
    if (currentImages.length > 0) {
      base64Urls = await Promise.all(
        currentImages.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      );
    }

    addMessage({
      role: 'user',
      content: userText || t('chat.imageUploaded'),
      imageUrls: base64Urls,
    });

    sendMutation.mutate({
      chatId,
      message: userText,
      images: currentImages.length > 0 ? currentImages : undefined
    });
  }, [input, draftImages, addMessage, t, setDraftImages, sendMutation, chatId]);

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
      const wavAudioBlob = await convertAudioBlobToWav(audioBlob);
      const transcriptionResponse = await audioService.transcribeAudio(wavAudioBlob);
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
    setDraftImages([]);
    newChat();
  }, [newChat, setDraftImages]);

  const handleClearMemory = useCallback(async () => {
    if (window.confirm(t('chat.confirmClearMemory'))) {
      await clearBackendMemory();
    }
  }, [clearBackendMemory, t]);

  const handleEditMessage = useCallback(async (msg: ChatMessage) => {
    setInput(msg.content);
    await trimBackendMemory(msg.content);
  }, [trimBackendMemory]);

  const handleImageSelect = (files: File[]) => {
    setDraftImages([...draftImages, ...files]);
  };

  const handleRemoveImage = (index: number) => {
    setDraftImages(draftImages.filter((_, i) => i !== index));
  };

  return {
    messages,
    input,
    setInput,
    isPending,
    isClearing,
    draftImages,
    imagePreviewUrls,
    messagesEndRef,
    handleSend,
    handleNewChat,
    handleClearMemory,
    handleEditMessage,
    handleAudioRecorded,
    handleImageSelect,
    handleRemoveImage,
    t,
  };
}
