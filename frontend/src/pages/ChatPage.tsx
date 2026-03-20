import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { useMutation } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export function ChatPage() {
  const { t } = useTranslation();
  const [chatId, setChatId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: chatService.sendMessage,
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: data.response },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: t('chat.error') },
      ]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, mutation.isPending]);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;

    const userMsg = input.trim();
    const imageToSend = selectedImage;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: userMsg, image: imageToSend || undefined },
    ]);
    
    setInput('');
    removeSelectedImage();
    
    mutation.mutate({ chatId, message: userMsg, image: imageToSend || undefined });
  };

  const handleNewChat = () => {
    setChatId(crypto.randomUUID());
    setMessages([]);
    removeSelectedImage();
  };

  return (
    <div className="flex flex-col h-full bg-dn-bg min-h-[calc(100vh-80px)]">
      <PageHeader
        title={t('chat.title')}
        action={
          <button
            onClick={handleNewChat}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-surface transition-colors"
            aria-label={t('chat.newChat')}
          >
            <Icon name="add" className="text-[18px]" />
          </button>
        }
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-dn-text-main/50 space-y-4">
            <Icon name="smart_toy" className="text-4xl text-dn-primary/50" />
            <p className="text-sm text-center px-8">{t('chat.emptyState')}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-dn-primary text-dn-bg rounded-br-none'
                    : 'bg-dn-surface text-dn-text-main rounded-bl-none border border-dn-border'
                }`}
              >
                {msg.image && (
                  <img src={msg.image} alt="Uploaded" className="max-w-full rounded-lg mb-2" style={{ maxHeight: '200px', objectFit: 'contain' }} />
                )}
                {msg.content && <div>{msg.content}</div>}
              </div>
            </div>
          ))
        )}

        {mutation.isPending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-dn-surface text-dn-text-main/70 rounded-bl-none border border-dn-border flex items-center space-x-2 shadow-sm">
              <div className="w-1.5 h-1.5 bg-dn-text-main/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-dn-text-main/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-dn-text-main/50 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-dn-border bg-dn-surface mt-auto">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-dn-border object-cover" />
            <button
              type="button"
              onClick={removeSelectedImage}
              className="absolute -top-2 -right-2 bg-dn-surface-low text-dn-text-main rounded-full w-6 h-6 flex items-center justify-center border border-dn-border shadow-sm hover:bg-dn-surface transition-colors"
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          </div>
        )}
        <form
          className="flex space-x-2 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 flex items-center justify-center rounded-full shrink-0 text-dn-text-main/50 hover:bg-dn-surface-low transition-colors"
            disabled={mutation.isPending}
          >
            <Icon name="image" className="text-[20px]" />
          </button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageSelect}
          />
          <input
            type="text"
            className="flex-1 rounded-full bg-dn-surface-low border border-dn-border px-4 py-2.5 text-sm text-dn-text-main focus:outline-none focus:ring-1 focus:ring-dn-primary focus:border-dn-primary transition-all placeholder:text-dn-text-main/40"
            placeholder={t('chat.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={mutation.isPending}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !selectedImage) || mutation.isPending}
            className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-colors ${
              (input.trim() || selectedImage) && !mutation.isPending
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
