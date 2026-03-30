import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { ChatMessage as ChatMessageType } from '@/store/chatStore';

interface ChatMessageProps {
  message: ChatMessageType;
  onEdit?: (msg: ChatMessageType) => void;
}

export function ChatMessage({ message, onEdit }: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePressStart = () => {
    if (!isUser || !onEdit) return;
    longPressTimer.current = setTimeout(() => setShowEditModal(true), 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <>
    <div
      className=""
    >
      <div className="max-w-4xl mt-5 px-4 md:px-8 flex flex-col">

        {/* Header Row: Icon + Role + Actions */}
        <div className={`flex items-center gap-2 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex items-center gap-1 ${isUser ? 'flex-row-reverse' : 'flex-row'} rounded-4xl border border-white/10 max-w-min px-4 py-3`}>
            <Icon
              name={isUser ? 'person' : 'smart_toy'}
              className="text-xl leading-0 text-dn-primary"
            />
            <span className="text-xs uppercase tracking-[0.2em] font-black text-dn-text-main/70 leading-none">
              {isUser ? t('chat.user') : t('chat.assistant')}
            </span>
          </div>
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
          <div className={`min-w-0 relative ${isUser ? 'group' : ''}`}>
            <div className={`transition-all duration-300 ${isUser ? 'group-hover:blur-md group-hover:opacity-40 group-hover:select-none' : ''}`}>
              {isUser ? (
                <div
                  className="whitespace-pre-wrap text-sm leading-relaxed text-dn-text-main/90 text-right md:text-left selection:bg-dn-primary/30"
                  onMouseDown={handlePressStart}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={handlePressStart}
                  onTouchEnd={handlePressEnd}
                  onTouchMove={handlePressEnd}
                >
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

            {/* Hover Actions Overlay */}
            {isUser && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto scale-90 group-hover:scale-100 transition-all duration-300">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    className="shadow-2xl backdrop-blur-md bg-dn-surface/80 border-white/10"
                  >
                    <Icon name={isCopied ? 'check' : 'content_copy'} className="text-sm" />
                    <span>{isCopied ? t('chat.copied') : t('chat.copy')}</span>
                  </Button>
                  {onEdit && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowEditModal(true)}
                      className="shadow-2xl"
                    >
                      <Icon name="edit" className="text-sm" />
                      <span>{t('common.edit')}</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {showEditModal && (
      <ConfirmModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={() => {
          setShowEditModal(false);
          onEdit?.(message);
        }}
        title={t('chat.editMessage')}
        message={t('chat.confirmEditMessage')}
        confirmLabel={t('chat.editMessage')}
        variant="primary"
      />
    )}
    </>
  );
}
