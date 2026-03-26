import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { useMutation } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';
import { useChatStore } from '@/store/chatStore';
import type { ChatMode } from '@/store/chatStore';
import type { ChatSendParams } from '@/models/chat';

export function ChatPage() {
  const { t } = useTranslation();
  const { chatId, messages, mode, isClearing, addMessage, setMode, newChat, clearBackendMemory } = useChatStore();
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unified mutation — handles text-only and text+image via the same endpoint
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleSend = () => {
    const userText = input.trim();
    const image = pendingImage;

    if (!userText && !image) return;

    addMessage({
      role: 'user',
      content: userText || t('chat.imageUploaded'),
      imageUrl: imagePreviewUrl ?? undefined,
    });

    setInput('');
    setPendingImage(null);
    setImagePreviewUrl(null);

    sendMutation.mutate({ chatId, message: userText, mode, image: image ?? undefined });
  };

  const handleNewChat = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setPendingImage(null);
    setImagePreviewUrl(null);
    newChat();
  };

  const handleClearMemory = async () => {
    if (window.confirm(t('chat.confirmClearMemory'))) {
      await clearBackendMemory();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setPendingImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setPendingImage(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const handleToggleMode = (newMode: ChatMode) => {
    setMode(newMode);
  };

  return (
    <div className="flex flex-col h-full bg-dn-bg min-h-[calc(100vh-80px)]">
      <PageHeader
        title={t('chat.title')}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleNewChat}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-surface transition-colors"
              aria-label={t('chat.newChat')}
              title={t('chat.newChat')}
            >
              <Icon name="add" className="text-[18px]" />
            </button>
            <button
              onClick={handleClearMemory}
              disabled={isClearing || messages.length === 0}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-error hover:text-white transition-colors disabled:opacity-30"
              aria-label={t('chat.clearMemory')}
              title={t('chat.clearMemory')}
            >
              <Icon name="delete_sweep" className="text-[18px]" />
            </button>
          </div>
        }
      />

      {/* Mode Toggle */}
      <div className="px-4 pt-2 pb-1">
        <div className="flex rounded-full bg-dn-surface-low border border-dn-border p-0.5 w-fit mx-auto">
          <button
            onClick={() => handleToggleMode('query')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              mode === 'query'
                ? 'bg-dn-primary text-dn-bg shadow-sm'
                : 'text-dn-text-main/60 hover:text-dn-text-main'
            }`}
          >
            <Icon name="search" className="text-[14px]" />
            {t('chat.modeQuery')}
          </button>
          <button
            onClick={() => handleToggleMode('agent')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              mode === 'agent'
                ? 'bg-dn-primary text-dn-bg shadow-sm'
                : 'text-dn-text-main/60 hover:text-dn-text-main'
            }`}
          >
            <Icon name="smart_toy" className="text-[14px]" />
            {t('chat.modeAgent')}
          </button>
        </div>
        <p className="text-[10px] text-dn-text-main/40 text-center mt-1">
          {mode === 'query' ? t('chat.modeQueryHint') : t('chat.modeAgentHint')}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-dn-text-main/50 space-y-4">
            <Icon name={mode === 'query' ? 'search' : 'smart_toy'} className="text-4xl text-dn-primary/50" />
            <p className="text-sm text-center px-8">{t('chat.emptyState')}</p>
            {mode === 'agent' && (
              <p className="text-xs text-center px-8 text-dn-text-main/30">
                {t('chat.imageHint')}
              </p>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-dn-primary text-dn-bg rounded-br-none'
                    : 'bg-dn-surface text-dn-text-main rounded-bl-none border border-dn-border'
                }`}
              >
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt={t('chat.imageUploaded')}
                    className="rounded-lg mb-2 max-h-48 w-auto object-contain"
                  />
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))
        )}

        {isPending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-dn-surface text-dn-text-main/70 rounded-bl-none border border-dn-border flex items-center space-x-2 shadow-sm">
              <div className="w-1.5 h-1.5 bg-dn-text-main/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-dn-text-main/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-dn-text-main/50 rounded-full animate-bounce" />
              {sendMutation.isPending && pendingImage && (
                <span className="ml-2 text-xs text-dn-text-main/50">{t('chat.processingImage')}</span>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview Bar (visible only in agent mode) */}
      {imagePreviewUrl && (
        <div className="px-4 pt-2 border-t border-dn-border bg-dn-surface-low">
          <div className="flex items-center gap-3">
            <img
              src={imagePreviewUrl}
              alt={t('chat.imageUploaded')}
              className="h-16 w-16 rounded-lg object-cover border border-dn-border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dn-text-main/70 truncate">{pendingImage?.name}</p>
              <p className="text-xs text-dn-text-main/40">
                {pendingImage && (pendingImage.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              onClick={handleRemoveImage}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-dn-surface transition-colors text-dn-text-main/50 hover:text-dn-text-main"
              aria-label={t('common.close')}
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-dn-border bg-dn-surface mt-auto">
        <form
          className="flex items-end space-x-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Image upload button — only in agent mode */}
          {mode === 'agent' && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                isPending
                  ? 'bg-dn-surface-low text-dn-text-main/20'
                  : 'bg-dn-surface-low text-dn-text-main/60 hover:text-dn-primary hover:bg-dn-primary/10'
              }`}
              aria-label={t('chat.uploadImage')}
              title={t('chat.uploadImage')}
            >
              <Icon name="add_photo_alternate" className="text-[20px]" />
            </button>
          )}

          <input
            type="text"
            className="flex-1 rounded-full bg-dn-surface-low border border-dn-border px-4 py-2.5 text-sm text-dn-text-main focus:outline-none focus:ring-1 focus:ring-dn-primary focus:border-dn-primary transition-all placeholder:text-dn-text-main/40"
            placeholder={mode === 'agent' ? t('chat.placeholderAgent') : t('chat.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPending}
          />

          <button
            type="submit"
            disabled={(!input.trim() && !pendingImage) || isPending}
            className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-colors ${
              (input.trim() || pendingImage) && !isPending
                ? 'bg-dn-primary text-dn-bg hover:bg-dn-primary/90'
                : 'bg-dn-surface-low text-dn-text-main/30'
            }`}
          >
            <Icon name="send" className="text-[18px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
