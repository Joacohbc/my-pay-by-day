import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { ChatInput } from '@/components/chat/ChatInput';
import type { FileDto } from '@/models';

interface AiChatWidgetProps {
  /** 'modal' anchors inside a scrollable Modal body; 'page' pins to the viewport corner (full-page forms). */
  variant: 'modal' | 'page';
  isLoading?: boolean;
  hasMessages: boolean;
  children: ReactNode;
  inputContent: string;
  setInputContent: (value: string) => void;
  onSend: () => void;
  onAudioRecorded?: (blob: Blob) => Promise<void>;
  onAudioFileSelected?: (file: File) => Promise<void>;
  draftFiles?: FileDto[];
  onAddFile?: (file: FileDto) => void;
  onRemoveFile?: (fileId: number) => void;
  placeholder?: string;
}

export function AiChatWidget({
  variant,
  isLoading = false,
  hasMessages,
  children,
  inputContent,
  setInputContent,
  onSend,
  onAudioRecorded,
  onAudioFileSelected,
  draftFiles,
  onAddFile,
  onRemoveFile,
  placeholder,
}: AiChatWidgetProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, hasMessages, isLoading]);

  // 'sticky' (not absolute/fixed) keeps the launcher anchored to the bottom of the modal's own
  // scrollable body, instead of escaping its rounded corners or floating over the backdrop.
  const wrapperClass =
    // bottom-20 clears the 80px fixed bottom nav bar (see BottomNav.tsx); left side avoids colliding with
    // DraftBadge, which floats bottom-20 right-3 on the same event pages.
    variant === 'page' ? 'fixed bottom-20 left-3 z-50' : 'sticky bottom-3 z-20 flex justify-end pointer-events-none';
  const surfaceClass = variant === 'modal' ? 'pointer-events-auto' : '';

  if (!open) {
    return (
      <div className={wrapperClass}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${surfaceClass} inline-flex items-center gap-1.5 px-3 py-2 rounded-pill bg-dn-primary text-white shadow-lg hover:bg-dn-primary/90 transition-colors text-xs font-medium`}
        >
          <Icon name="auto_awesome" className="text-[16px]" />
          {t('ai.chatWidget.launcher')}
        </button>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div
        className={`${surfaceClass} w-full max-w-sm bg-dn-surface border border-white/10 rounded-card shadow-xl flex flex-col max-h-[60vh]`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-dn-bg/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-dn-text-main">
            <Icon name="auto_awesome" className="text-[16px] text-dn-primary" />
            {t('ai.chatWidget.title')}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {!hasMessages && <p className="text-xs text-dn-text-muted text-center py-4">{t('ai.chatWidget.emptyHint')}</p>}
          {children}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-dn-text-muted px-1">
              <Spinner size="sm" />
              {t('ai.chatWidget.thinking')}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          inputContent={inputContent}
          setInputContent={setInputContent}
          onSend={onSend}
          onAudioRecorded={onAudioRecorded}
          onAudioFileSelected={onAudioFileSelected}
          isPending={isLoading}
          draftFiles={draftFiles}
          onAddFile={onAddFile}
          onRemoveFile={onRemoveFile}
          placeholder={placeholder ?? t('ai.chatWidget.placeholder')}
        />
      </div>
    </div>
  );
}
