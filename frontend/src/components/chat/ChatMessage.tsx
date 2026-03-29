import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { ChatMessage as ChatMessageType } from '@/store/chatStore';

interface ChatMessageProps {
  message: ChatMessageType;
  onEdit?: (msg: ChatMessageType) => void;
  isClearing?: boolean;
  isPending?: boolean;
}

export function ChatMessage({ message, onEdit, isClearing, isPending }: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  return (
    <div
      className={`w-full py-6 md:py-8 border-b border-dn-border/20 transition-colors ${
        isUser ? 'bg-dn-surface-low/20' : 'bg-dn-bg'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-8 flex flex-col space-y-4">
        {/* Header Row: Icon + Role */}
        <div className={`flex items-center ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex items-center gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-7 h-7 flex items-center justify-center rounded-lg shadow-sm border ${
              isUser 
                ? 'bg-dn-primary border-dn-primary text-dn-bg' 
                : 'bg-dn-surface-low border-dn-border text-dn-primary'
            }`}>
              <Icon name={isUser ? 'person' : 'smart_toy'} className="text-[16px]" />
            </div>
            <span className="text-[11px] uppercase tracking-[0.2em] font-black text-dn-text-main/40 leading-none">
              {isUser ? t('chat.user') : t('chat.assistant')}
            </span>
          </div>
          
          {/* User message edit button */}
          {isUser && !isClearing && !isPending && onEdit && (
            <button
              onClick={() => onEdit(message)}
              className="ml-auto mr-0 md:mr-auto md:ml-4 p-1 rounded-md text-dn-text-main/20 hover:text-dn-primary transition-colors hover:bg-dn-primary/5"
              title={t('common.edit')}
            >
              <Icon name="edit" className="text-[14px] leading-none" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex flex-col space-y-4">
          {/* Images */}
          {message.imageUrls && message.imageUrls.length > 0 && (
            <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {message.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={t('chat.imageUploaded')}
                  className="rounded-xl max-h-72 w-auto object-contain shadow-lg border border-dn-border/30"
                />
              ))}
            </div>
          )}

          {/* Text/Markdown content */}
          <div className="min-w-0">
            {isUser ? (
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-dn-text-main/90 text-right md:text-left selection:bg-dn-primary/30">
                {message.content}
              </div>
            ) : (
              <div className="prose prose-sm prose-invert max-w-none prose-table:my-0 prose-p:leading-relaxed selection:bg-dn-primary/20">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ ...props }) => (
                      <div className="overflow-x-auto my-8 -mx-1 px-1">
                        <table {...props} className="min-w-full border-collapse border border-dn-border/20 rounded-xl overflow-hidden shadow-sm bg-dn-surface-low/20" />
                      </div>
                    ),
                    thead: ({ ...props }) => <thead {...props} className="bg-dn-surface-low/50" />,
                    th: ({ ...props }) => (
                      <th
                        {...props}
                        className="px-5 py-3.5 text-left text-[11px] font-bold text-dn-text-main/50 uppercase tracking-widest border-b border-dn-border/30 whitespace-nowrap"
                      />
                    ),
                    td: ({ ...props }) => (
                      <td
                        {...props}
                        className="px-5 py-3.5 text-sm text-dn-text-main/80 border-b border-dn-border/10 whitespace-nowrap"
                      />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
