import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { ChatInput } from '@/components/chat/ChatInput';
import type { FileDto } from '@/models';
import type { FormPatchEntityType } from '@/hooks/useFormPatchChat';

interface AiChatWidgetProps {
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
  /** Seconds left before a debounced send actually fires; null when nothing is queued. */
  countdown?: number | null;
  /** Skips the debounce wait and sends immediately. */
  onSendNow?: () => void;
  /** Cancels an in-flight (already-sent) request. */
  onStop?: () => void;
  entityType: FormPatchEntityType | 'event';
}

export function AiChatWidget({
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
  countdown,
  onSendNow,
  onStop,
  entityType
}: AiChatWidgetProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, hasMessages, isLoading]);

  // Always fixed at page level with max z-index, regardless of variant
  let wrapperClass;
  if(entityType == 'event') {
    wrapperClass = 'fixed bottom-24 right-6 z-[9999] flex flex-col items-end pointer-events-none';
  } else {
    wrapperClass = `fixed bottom-14 ${open ? 'right-6' : 'right-40 left-50'} z-[9999] flex flex-col items-center pointer-events-none`;
  }

  const surfaceClass = 'pointer-events-auto';

  if (!open) {
    return (
      <div className={wrapperClass}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('ai.chatWidget.launcher')}
          title={t('ai.chatWidget.launcher')}
          className={`${surfaceClass} w-11 h-11 flex items-center justify-center rounded-full bg-dn-primary text-white shadow-lg hover:bg-dn-primary/90 transition-colors`}
        >
          <Icon name="auto_awesome" className="text-[20px]" />
        </button>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div
        className={`${surfaceClass} w-[90vw] sm:w-[384px] bg-dn-surface border border-white/10 rounded-card shadow-xl flex flex-col max-h-[60vh]`}
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
          countdown={countdown}
          onSendNow={onSendNow}
          onStop={onStop}
        />
      </div>
    </div>
  );
}
