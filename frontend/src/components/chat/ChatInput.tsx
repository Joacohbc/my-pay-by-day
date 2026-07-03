import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Textarea';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAlert } from '@/contexts/AlertContext';
import { FileUploader } from '@/components/ui/FileUploader';
import type { FileDto } from '@/models';

interface ChatInputProps {
  inputContent: string;
  setInputContent: (val: string) => void;
  onSend: () => void;
  onAudioRecorded?: (audioBlob: Blob) => Promise<void>;
  onAudioFileSelected?: (file: File) => Promise<void>;
  isPending?: boolean;
  draftFiles?: FileDto[];
  onAddFile?: (file: FileDto) => void;
  onRemoveFile?: (fileId: number) => void;
  placeholder?: string;
  countdown?: number | null;
  onSendNow?: () => void;
  onStop?: () => void;
  instantDraftMode?: boolean;
  onToggleInstantDraft?: () => void;
}

export function ChatInput({
  inputContent,
  setInputContent,
  onSend,
  onAudioRecorded,
  onAudioFileSelected,
  isPending,
  draftFiles = [],
  onAddFile,
  onRemoveFile,
  placeholder,
  countdown = null,
  onSendNow,
  onStop,
  instantDraftMode = false,
  onToggleInstantDraft,
}: ChatInputProps) {
  const { t } = useTranslation();
  const { error: showError } = useAlert();
  const [showUploader, setShowUploader] = useState(false);

  const handleAudioFile = useCallback(
    async (file: File) => {
      try {
        await onAudioFileSelected?.(file);
      } catch {
        showError(t('chat.transcriptionFailed'));
      }
    },
    [onAudioFileSelected, showError, t],
  );

  const handleVoiceError = useCallback((errorKey: string) => {
    if (errorKey === 'voice_not_supported') {
      showError(t('chat.voiceNotSupported'));
      return;
    }

    if (errorKey === 'microphone_denied') {
      showError(t('chat.microphoneDenied'));
      return;
    }

    showError(t('chat.transcriptionFailed'));
  }, [showError, t]);

  const {
    recordingState,
    isRecordingSupported,
    toggleRecording,
  } = useVoiceRecorder(onAudioRecorded ?? (() => Promise.resolve()), handleVoiceError);

  const isRecording = recordingState === 'recording';
  const isPreparingAudio = recordingState === 'preparing';
  const isBusy = isPreparingAudio;

  const micTitle = isRecording
    ? t('chat.stopRecording')
    : isPreparingAudio
      ? t('chat.transcribing')
      : t('chat.startRecording');

  const micButtonClass = isRecording
    ? 'text-dn-error bg-dn-error/10 hover:bg-dn-error/20 animate-pulse'
    : isPreparingAudio
      ? 'text-dn-primary/40'
      : 'text-dn-text-main/50 hover:text-dn-primary hover:bg-dn-primary/10';

  const canSend = (inputContent.trim() || draftFiles.length > 0) && !isBusy && !isRecording && !isPending;

  return (
    <div className="px-3 pb-3 pt-2 mt-auto">
      {isPreparingAudio && (
        <p className="text-[10px] text-dn-primary/40 uppercase tracking-[0.2em] font-black px-1 pb-2">
          {t('chat.transcribing')}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="rounded-2xl border border-dn-border/20 bg-dn-surface-low focus-within:border-dn-primary/20 transition-colors overflow-hidden"
      >
        {/* Textarea — takes the prominent space */}
        <Textarea
          containerClassName="w-full"
          className="px-4! py-3! text-sm bg-transparent! border-none! ring-0! focus:ring-0! rounded-none! min-h-13! max-h-45! overflow-y-auto resize-none"
          placeholder={placeholder || (instantDraftMode ? t('chat.instantDraft.placeholder') : t('chat.placeholderAgent'))}
          value={inputContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputContent(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={isBusy || isRecording}
        />

        {/* File Uploader */}
        {(showUploader || draftFiles.length > 0) && onAddFile && onRemoveFile && (
          <div className="px-3 pb-3 border-t border-dn-border/10 pt-3">
            <FileUploader
              files={draftFiles}
              onAddFile={onAddFile}
              onRemoveFile={onRemoveFile}
              accept={onAudioFileSelected ? 'image/*,video/*,.pdf,.csv,.json,text/*,audio/*,.docx,.xlsx,.xls,.pptx,.epub,.html,.htm,.xml,.md,.msg' : undefined}
              onAudioFile={onAudioFileSelected ? handleAudioFile : undefined}
            />
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between px-2 pb-2 gap-2">
          {/* Left: media actions */}
          <div className="flex items-center gap-0.5">
            {onAddFile && (
              <button
                type="button"
                onClick={() => setShowUploader(!showUploader)}
                disabled={isBusy || isRecording}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                  showUploader
                    ? 'text-dn-primary bg-dn-primary/10'
                    : isBusy || isRecording
                      ? 'text-dn-text-main/20'
                      : 'text-dn-text-main/50 hover:text-dn-primary hover:bg-dn-primary/10'
                }`}
                aria-label={t('chat.attachFile', 'Attach file')}
                title={t('chat.attachFile', 'Attach file')}
              >
                <Icon name="attach_file" className="text-[20px]" />
              </button>
            )}

            {onAudioRecorded && isRecordingSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isBusy}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${micButtonClass}`}
                aria-label={micTitle}
                title={micTitle}
              >
                <Icon name={isRecording ? 'mic_off' : 'mic'} className="text-[20px]" />
              </button>
            )}

            {onToggleInstantDraft && (
              <button
                type="button"
                onClick={onToggleInstantDraft}
                disabled={isPending}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                  instantDraftMode
                    ? 'text-dn-primary bg-dn-primary/10'
                    : 'text-dn-text-main/50 hover:text-dn-primary hover:bg-dn-primary/10'
                }`}
                aria-label={t('chat.instantDraft.toggle')}
                title={t('chat.instantDraft.toggle')}
              >
                <Icon name="flash_on" className="text-[20px]" />
              </button>
            )}
          </div>

          {/* Right: Action button (Stop / Send Now) and Send button */}
          <div className="flex items-center gap-2">
            {((isPending && onStop) || (countdown !== null && onSendNow)) && (
              <button
                type="button"
                onClick={isPending ? onStop : onSendNow}
                className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 transition-all shadow-sm ${
                  isPending
                    ? 'bg-dn-error text-white hover:bg-dn-error/80'
                    : 'bg-dn-primary/20 text-dn-primary hover:bg-dn-primary/30 border border-dn-primary/30 animate-pulse'
                }`}
                aria-label={isPending ? t('chat.stop') : t('chat.sendNow')}
                title={isPending ? t('chat.stop') : `${t('chat.sendNow')} (${countdown}s)`}
              >
                <Icon name={isPending ? 'stop' : 'bolt'} className="text-[20px]" />
              </button>
            )}
            
            <button
              type="submit"
              disabled={!canSend}
              className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 transition-all ${
                canSend
                  ? 'bg-dn-primary text-white hover:bg-dn-primary/80 shadow-sm'
                  : 'bg-dn-surface text-dn-text-main/20'
              }`}
            >
              <Icon name="send" className="text-[18px]" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
