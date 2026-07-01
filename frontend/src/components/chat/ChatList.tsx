import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { chatService, type ChatSummary } from '@/services/chat.service';
import { useChatStore } from '@/store/chatStore';
import { formatDate, truncate } from '@/lib/format';

const PREVIEW_MAX_LENGTH = 80;

export function ChatList() {
  const { t } = useTranslation();
  const { selectChat, chatId: activeChatId } = useChatStore();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchChats = async () => {
      setIsLoading(true);
      try {
        const result = await chatService.listChats();
        if (active) setChats(result);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchChats();
    return () => { active = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-dn-primary/30 border-t-dn-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-dn-text-main/50 space-y-4 py-20">
        <Icon name="forum" className="text-4xl text-dn-primary/50" />
        <p className="text-sm text-center px-8">{t('chat.noConversations')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
      {chats.map((chat) => {
        const isActive = chat.chatId === activeChatId;
        return (
          <button
            key={chat.chatId}
            onClick={() => selectChat(chat.chatId)}
            className={`w-full text-left rounded-2xl p-4 transition-all duration-200 border ${
              isActive
                ? 'bg-dn-primary/10 border-dn-primary/30'
                : 'bg-dn-surface-low border-transparent hover:bg-dn-surface hover:border-white/5'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-8 h-8 flex items-center justify-center rounded-xl shrink-0 ${
                isActive ? 'bg-dn-primary/20 text-dn-primary' : 'bg-dn-surface text-dn-text-muted'
              }`}>
                <Icon name="chat_bubble" className="text-[16px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  isActive ? 'text-dn-primary' : 'text-dn-text-main'
                }`}>
                  {chat.title
                    ? chat.title
                    : chat.preview
                      ? truncate(chat.preview, PREVIEW_MAX_LENGTH)
                      : t('chat.newChat')
                  }
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-dn-text-muted">
                    {formatDate(chat.lastMessageAt)}
                  </span>
                  <span className="text-[11px] text-dn-text-muted/50">·</span>
                  <span className="text-[11px] text-dn-text-muted">
                    {t('chat.messagesCount', { count: chat.messageCount })}
                  </span>
                </div>
              </div>
              <Icon name="chevron_right" className="text-[18px] text-dn-text-muted/40 mt-1" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
