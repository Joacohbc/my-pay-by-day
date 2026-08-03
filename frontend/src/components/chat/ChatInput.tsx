import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Textarea';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAlert } from '@/contexts/AlertContext';
import { FileUploader } from '@/components/ui/FileUploader';
import { MultimediaPreviewer } from '@/components/files/MultimediaPreviewer';
import { filesService } from '@/services/files.service';
import { getFileIcon, getFileTypeLabel } from '@/lib/fileUtils';
import type { FileDto } from '@/models';
import { logger } from '@/lib/logger';

interface ChatInputProps {
  inputContent: string;
  setInputContent: (val: string) => void;
  onSend: () => void;
  onAudioRecorded?: (audioBlob: Blob) => Promise<void>;
  onAudioRecordedEnhanced?: (audioBlob: Blob, currentText: string) => Promise<void>;
  onAudioFileSelected?: (file: File) => Promise<void>;
  isPending?: boolean;
  disabled?: boolean;
  draftFiles?: FileDto[];
  pendingFiles?: File[];
  onAddFile?: (file: FileDto) => void;
  onAddFiles?: (files: FileDto[]) => void;
  onRemoveFile?: (fileId: number) => void;
  onRemoveFiles?: (fileIds: number[]) => void;
  onRemovePendingFile?: (index: number) => void;
  placeholder?: string;
  countdown?: number | null;
  onSendNow?: () => void;
  onStop?: () => void;
  onQuickCreate?: () => void;
}

interface PendingFileChipProps {
  file: File;
  onRemove?: () => void;
}

function PendingFileChip({ file, onRemove }: PendingFileChipProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const isImage = file.type.startsWith('image/');
  const previewUrl = useMemo(() => (isImage ? URL.createObjectURL(file) : null), [isImage, file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-dn-surface/90 px-2.5 py-1.5 shadow-sm"
      title={t('chat.pendingUploadNotice')}
    >
      {previewUrl && !imageError ? (
        <img
          src={previewUrl}
          alt={file.name}
          onError={() => setImageError(true)}
          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/5"
        />
      ) : (
        <div className="w-9 h-9 rounded-lg bg-dn-surface-low border border-white/5 flex items-center justify-center text-dn-text-muted shrink-0">
          <Icon name={getFileIcon(file.type)} className="text-base" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-dn-text-main truncate max-w-40">{file.name}</p>
        <p className="text-[10px] text-dn-text-muted">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded-md text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors shrink-0 cursor-pointer"
          aria-label={t('common.delete')}
          title={t('common.delete')}
        >
          <Icon name="close" className="text-[14px]" />
        </button>
      )}
    </div>
  );
}

interface DraftFileChipProps {
  file: FileDto;
  onRemove?: () => void;
}

function DraftFileChip({ file, onRemove }: DraftFileChipProps) {
  const { t } = useTranslation();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isImage = file.mimeType?.startsWith('image/');
  const contentUrl = filesService.getContentUrl(file.id);

  return (
    <>
      <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-dn-surface/90 px-2.5 py-1.5 shadow-sm hover:border-dn-primary/30 transition-all">
        {isImage && !imageError ? (
          <img
            src={contentUrl}
            alt={file.fileName}
            onError={() => setImageError(true)}
            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/5 cursor-pointer"
            onClick={() => setIsPreviewOpen(true)}
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-dn-surface-low border border-white/5 flex items-center justify-center text-dn-primary shrink-0">
            <Icon name={getFileIcon(file.mimeType)} className="text-base" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-dn-text-main truncate max-w-40">{file.fileName}</p>
          <p className="text-[10px] text-dn-text-muted">
            {(file.size / 1024).toFixed(1)} KB • {getFileTypeLabel(file.fileName, file.mimeType)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors cursor-pointer"
            title={t('common.view')}
          >
            <Icon name="visibility" className="text-[14px]" />
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="w-6 h-6 flex items-center justify-center rounded-md text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors cursor-pointer"
              title={t('common.delete')}
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          )}
        </div>
      </div>

      {isPreviewOpen && (
        <MultimediaPreviewer
          fileId={file.id}
          fileName={file.fileName}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
}

export function ChatInput({
  inputContent,
  setInputContent,
  onSend,
  onAudioRecorded,
  onAudioRecordedEnhanced,
  onAudioFileSelected,
  isPending,
  disabled = false,
  draftFiles = [],
  pendingFiles = [],
  onAddFile,
  onAddFiles,
  onRemoveFile,
  onRemoveFiles,
  onRemovePendingFile,
  placeholder,
  countdown = null,
  onSendNow,
  onStop,
  onQuickCreate,
}: ChatInputProps) {
  const { t } = useTranslation();
  const { error: showError } = useAlert();
  const [showUploader, setShowUploader] = useState(false);

  const handleAudioFile = useCallback(
    async (file: File) => {
      try {
        await onAudioFileSelected?.(file);
      } catch (error) {
        logger.child('chatInput').error('Audio file transcription failed', { error, fileName: file.name, mimeType: file.type, fileSizeBytes: file.size });
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

  const inputContentRef = useRef(inputContent);
  useEffect(() => {
    inputContentRef.current = inputContent;
  }, [inputContent]);

  const enhanceModeRef = useRef(false);
  const [isEnhanceRecording, setIsEnhanceRecording] = useState(false);

  const dispatchRecordedAudio = useCallback(
    async (audioBlob: Blob) => {
      const useEnhance = enhanceModeRef.current;
      enhanceModeRef.current = false;
      setIsEnhanceRecording(false);

      if (useEnhance && onAudioRecordedEnhanced) {
        await onAudioRecordedEnhanced(audioBlob, inputContentRef.current);
        return;
      }
      await onAudioRecorded?.(audioBlob);
    },
    [onAudioRecorded, onAudioRecordedEnhanced],
  );

  const {
    recordingState,
    isRecordingSupported,
    toggleRecording,
  } = useVoiceRecorder(dispatchRecordedAudio, handleVoiceError);

  const isRecording = recordingState === 'recording';
  const isPreparingAudio = recordingState === 'preparing';
  const isBusy = isPreparingAudio;

  const isPlainRecording = isRecording && !isEnhanceRecording;
  const isEnhancedRecordingActive = isRecording && isEnhanceRecording;

  const togglePlainRecording = useCallback(() => {
    if (recordingState === 'idle') {
      enhanceModeRef.current = false;
    }
    toggleRecording();
  }, [recordingState, toggleRecording]);

  const toggleEnhancedRecording = useCallback(() => {
    if (recordingState === 'idle') {
      enhanceModeRef.current = true;
      setIsEnhanceRecording(true);
    }
    toggleRecording();
  }, [recordingState, toggleRecording]);

  const micTitle = isPlainRecording
    ? t('chat.stopRecording')
    : isPreparingAudio
      ? t('chat.transcribing')
      : t('chat.startRecording');

  const enhancedMicTitle = isEnhancedRecordingActive
    ? t('chat.stopRecording')
    : isPreparingAudio
      ? t('chat.transcribing')
      : t('chat.startRecordingEnhanced');

  const micButtonClass = isPlainRecording
    ? 'text-dn-error bg-dn-error/10 hover:bg-dn-error/20 animate-pulse'
    : isPreparingAudio
      ? 'text-dn-primary/40'
      : 'text-dn-text-main/50 hover:text-dn-primary hover:bg-dn-primary/10';

  const enhancedMicButtonClass = isEnhancedRecordingActive
    ? 'text-dn-error bg-dn-error/10 hover:bg-dn-error/20 animate-pulse'
    : isPreparingAudio
      ? 'text-dn-primary/40'
      : 'text-dn-text-main/50 hover:text-dn-primary hover:bg-dn-primary/10';

  const hasContent = Boolean(inputContent.trim()) || draftFiles.length > 0 || pendingFiles.length > 0;
  const canSend = hasContent && !isBusy && !isRecording && !isPending && !disabled;
  const isCountingDown = countdown !== null && !!onSendNow;

  return (
    <div className="px-3 pb-3 pt-2 mt-auto">
      {isPreparingAudio && (
        <p className="text-[10px] text-dn-primary/40 uppercase tracking-[0.2em] font-black px-1 pb-2">
          {t('chat.transcribing')}
        </p>
      )}

      {disabled && (
        <p className="text-[10px] text-dn-primary/60 uppercase tracking-[0.2em] font-black px-1 pb-2">
          {t('chat.question.answerAbove')}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isCountingDown) {
            onSendNow?.();
            return;
          }
          onSend();
        }}
        className="rounded-2xl border border-dn-border/20 bg-dn-surface-low focus-within:border-dn-primary/20 transition-colors overflow-hidden"
      >
        {/* Attached files drawer (both pending & uploaded draft files) */}
        {(pendingFiles.length > 0 || draftFiles.length > 0) && (
          <div className="px-3 pt-3 pb-2 border-b border-white/10 flex gap-2 overflow-x-auto no-scrollbar items-center bg-white/[0.02]">
            {pendingFiles.map((file, index) => (
              <div key={`${file.name}-${file.size}-${index}`} className="shrink-0">
                <PendingFileChip
                  file={file}
                  onRemove={onRemovePendingFile ? () => onRemovePendingFile(index) : undefined}
                />
              </div>
            ))}
            {draftFiles.map((file) => (
              <div key={file.id} className="shrink-0">
                <DraftFileChip
                  file={file}
                  onRemove={onRemoveFile ? () => onRemoveFile(file.id) : undefined}
                />
              </div>
            ))}
          </div>
        )}

        {/* Textarea — takes the prominent space */}
        <Textarea
          containerClassName="w-full"
          className="px-4! py-3! text-sm bg-transparent! border-none! ring-0! focus:ring-0! rounded-none! min-h-13! max-h-45! overflow-y-auto resize-none"
          placeholder={placeholder || t('chat.placeholderAgent')}
          value={inputContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputContent(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (isCountingDown) {
                onSendNow?.();
                return;
              }
              onSend();
            }
          }}
          disabled={isBusy || isRecording || disabled}
        />

        {/* File Uploader options drawer */}
        {showUploader && onAddFile && onRemoveFile && (
          <div className="px-4 pb-3 border-t border-white/10 pt-3 space-y-2">
            <p className="text-[11px] font-bold text-dn-text-muted/60 uppercase tracking-widest">
              {t('eventForm.files')}
            </p>
            <FileUploader
              files={[]}
              onAddFile={onAddFile}
              onAddFiles={onAddFiles}
              onRemoveFile={onRemoveFile}
              onRemoveFiles={onRemoveFiles}
              onAudioFile={onAudioFileSelected ? handleAudioFile : undefined}
              compact
            />
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">
          {/* Left: media actions */}
          <div className="flex items-center gap-1">
            {onAddFile && (
              <button
                type="button"
                onClick={() => setShowUploader(!showUploader)}
                disabled={isBusy || isRecording}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  showUploader
                    ? 'text-dn-primary bg-dn-primary/20 border border-dn-primary/30'
                    : isBusy || isRecording
                      ? 'text-dn-text-main/20'
                      : 'text-dn-text-main/50 hover:text-dn-primary hover:bg-white/5'
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
                onClick={togglePlainRecording}
                disabled={isBusy || isEnhancedRecordingActive}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${micButtonClass}`}
                aria-label={micTitle}
                title={micTitle}
              >
                <Icon name={isPlainRecording ? 'mic_off' : 'mic'} className="text-[20px]" />
              </button>
            )}

            {onAudioRecordedEnhanced && isRecordingSupported && (
              <button
                type="button"
                onClick={toggleEnhancedRecording}
                disabled={isBusy || isPlainRecording}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${enhancedMicButtonClass}`}
                aria-label={enhancedMicTitle}
                title={enhancedMicTitle}
              >
                <Icon name={isEnhancedRecordingActive ? 'mic_off' : 'auto_awesome'} className="text-[20px]" />
              </button>
            )}

            {onQuickCreate && (
              <button
                type="button"
                onClick={onQuickCreate}
                disabled={isBusy || isRecording || isPending || disabled || !hasContent}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all text-dn-text-main/50 hover:text-dn-primary hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                aria-label={t('chat.quickCreate.button')}
                title={t('chat.quickCreate.button')}
              >
                <Icon name="bolt" className="text-[20px]" />
              </button>
            )}
          </div>

          {/* Right: Action button (Stop) and Send button (doubles as Send Now during countdown) */}
          <div className="flex items-center gap-2">
            {(isPending || isCountingDown) && onStop && (
              <button
                type="button"
                onClick={onStop}
                className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all shadow-sm bg-dn-error text-white hover:bg-dn-error/80 cursor-pointer"
                aria-label={t('chat.stop')}
                title={t('chat.stop')}
              >
                <Icon name="stop" className="text-[20px]" />
              </button>
            )}

            <button
              type="submit"
              disabled={!canSend && !isCountingDown}
              aria-label={isCountingDown ? `${t('chat.sendNow')} (${countdown}s)` : undefined}
              title={isCountingDown ? `${t('chat.sendNow')} (${countdown}s)` : undefined}
              className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all cursor-pointer ${
                isCountingDown
                  ? 'bg-dn-primary/20 text-dn-primary hover:bg-dn-primary/30 border border-dn-primary/30 animate-pulse'
                  : canSend
                    ? 'bg-dn-primary text-white hover:bg-dn-primary/80 shadow-sm'
                    : 'bg-white/5 text-dn-text-main/20'
              }`}
            >
              <Icon name={isCountingDown ? 'bolt' : 'send'} className="text-[18px]" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
