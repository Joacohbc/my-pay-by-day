import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AudioMessagePlayer } from '@/components/chat/AudioMessagePlayer';
import { getFileIcon } from '@/lib/fileUtils';
import type { ChatMessage as ChatMessageType } from '@/store/chatStore';

interface ChatMessageProps {
  message: ChatMessageType;
  onEdit?: (msg: ChatMessageType) => void;
}

export function ChatMessage({ message, onEdit }: ChatMessageProps) {
  const { t } = useTranslation();
  const toolFriendlyNames: Record<string, string> = {
    listCategories: t('chat.tools.listCategories'),
    listTags: t('chat.tools.listTags'),
    listTagGroups: t('chat.tools.listTagGroups'),
    listNodes: t('chat.tools.listNodes'),
    searchEvents: t('chat.tools.searchEvents'),
    getEvent: t('chat.tools.getEvent'),
    listDrafts: t('chat.tools.listDrafts'),
    getDraft: t('chat.tools.getDraft'),
    createDraft: t('chat.tools.createDraft'),
    updateDraft: t('chat.tools.updateDraft'),
    deleteDraft: t('chat.tools.deleteDraft'),
    confirmDraft: t('chat.tools.confirmDraft'),
    calculate: t('chat.tools.calculate'),
    getCurrentDateTime: t('chat.tools.getCurrentDateTime'),
    saveMemory: t('chat.tools.saveMemory'),
    recallMemory: t('chat.tools.recallMemory'),
    forgetMemory: t('chat.tools.forgetMemory'),
  };
  const isUser = message.role === 'user';
  const allToolsDone = message.toolCalls?.every((tc) => tc.state === 'result') ?? true;
  const [isCollapsedByUser, setIsCollapsedByUser] = useState<boolean | null>(null);
  const isStepsExpanded = isCollapsedByUser === null ? !allToolsDone : !isCollapsedByUser;
  const audioMessageUrl = typeof message.audioUrl === 'string' && message.audioUrl.length > 0
    ? message.audioUrl
    : null;
  const hasAudioMessage = audioMessageUrl !== null;
  const hasTextContent = message.content.trim().length > 0;
  const isEditable = isUser && !!onEdit && hasTextContent;
  const canCopy = hasTextContent;
  const hasSideActions = canCopy || isEditable;
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
    <div>
      <div className={`max-w-4xl mx-auto mt-5 px-4 md:px-8 flex flex-col`}>

        {/* Header Row: Icon + Role */}
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

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {message.attachments.map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-dn-surface-low hover:bg-dn-surface rounded-xl border border-white/5 hover:border-dn-primary/30 transition-all min-w-[200px] max-w-sm"
                >
                  <div className="w-9 h-9 shrink-0 bg-dn-surface rounded-lg flex items-center justify-center text-dn-text-muted">
                    <Icon name={getFileIcon(file.type)} className="text-base" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dn-text-main truncate">{file.name}</p>
                    <p className="text-xs text-dn-text-muted truncate">
                      {file.type.split('/')[1] || file.type}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Text content + side actions */}
          <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${hasSideActions ? 'group' : ''}`}>

            {/* Main content */}
            <div className="min-w-0 flex-1">
              {isUser ? (
                <div className="flex flex-col items-end gap-2">
                  {hasAudioMessage && (
                    <AudioMessagePlayer
                      key={audioMessageUrl}
                      src={audioMessageUrl}
                      className="max-w-sm w-full"
                    />
                  )}

                  {message.audioTranscriptionStatus === 'pending' && (
                    <p className="text-[11px] text-dn-primary/60 text-right">
                      {t('chat.transcribing')}
                    </p>
                  )}

                  {message.audioTranscriptionStatus === 'failed' && (
                    <p className="text-[11px] text-dn-error text-right">
                      {t('chat.transcriptionFailed')}
                    </p>
                  )}

                  {hasTextContent && (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-dn-text-main/90 text-right selection:bg-dn-primary/30">
                      {message.content}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="flex flex-col rounded-xl bg-dn-surface-low/30 border border-white/5 max-w-md overflow-hidden transition-all">
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => setIsCollapsedByUser(isStepsExpanded)}
                        className="flex items-center justify-between w-full p-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            name={allToolsDone ? 'check_circle' : 'pending'}
                            className={`text-sm shrink-0 ${allToolsDone ? 'text-green-500/80' : 'text-dn-primary animate-spin'}`}
                          />
                          <span className="text-[10px] uppercase tracking-[0.15em] text-dn-text-muted/70 font-black leading-none">
                            {t('chat.tools.steps')} ({message.toolCalls.length})
                          </span>
                        </div>
                        <Icon
                          name="keyboard_arrow_down"
                          className={`text-base text-dn-text-muted transition-transform duration-200 ${
                            isStepsExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Accordion Content */}
                      {isStepsExpanded && (
                        <div className="flex flex-col gap-2 p-3 pt-0 border-t border-white/5">
                          {message.toolCalls.map((tc, idx) => {
                            const label = toolFriendlyNames[tc.name] || `${t('chat.tools.running')} (${tc.name})`;
                            const isDone = tc.state === 'result';
                            return (
                              <div key={idx} className="flex items-center gap-2 text-xs text-dn-text-main/70 first:mt-2">
                                <Icon
                                  name={isDone ? 'check_circle' : 'pending'}
                                  className={`text-[12px] shrink-0 ${isDone ? 'text-green-500/80' : 'text-dn-primary animate-spin'}`}
                                />
                                <span className={isDone ? 'opacity-50' : 'font-medium'}>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {hasTextContent && (
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
              )}
            </div>

            {/* Side action buttons — opposite side from text */}
            {hasSideActions && (
              <div className="flex flex-col gap-1 shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
                {canCopy && (
                  <button
                    onClick={handleCopy}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-dn-text-main/40 hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
                    title={isCopied ? t('chat.copied') : t('chat.copy')}
                  >
                    <Icon name={isCopied ? 'check' : 'content_copy'} className="text-[14px]" />
                  </button>
                )}
                {isEditable && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-dn-text-main/40 hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
                    title={t('common.edit')}
                  >
                    <Icon name="edit" className="text-[14px]" />
                  </button>
                )}
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
