import { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Textarea';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAlert } from '@/contexts/AlertContext';

interface ChatInputProps {
  inputContent: string;
  setInputContent: (val: string) => void;
  onSend: () => void;
  onImageSelect: (files: File[]) => void;
  isPending?: boolean;
  hasDraftImages?: boolean;
}

const VOICE_ERROR_KEYS: Record<string, string> = {
  voice_not_supported: 'chat.voiceNotSupported',
  microphone_denied: 'chat.microphoneDenied',
  transcription_failed: 'chat.transcriptionFailed',
};

export function ChatInput({ inputContent, setInputContent, onSend, onImageSelect, isPending, hasDraftImages }: ChatInputProps) {
  const { t } = useTranslation();
  const { error: showError } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appendTranscript = useCallback((transcript: string) => {
    const separator = inputContent.trim() ? ' ' : '';
    setInputContent(inputContent.trim() + separator + transcript);
  }, [inputContent, setInputContent]);

  const handleVoiceError = useCallback((errorKey: string) => {
    const translationKey = VOICE_ERROR_KEYS[errorKey] ?? 'chat.transcriptionFailed';
    showError(t(translationKey));
  }, [showError, t]);

  const {
    recordingState,
    isRecordingSupported,
    previewAudioUrl,
    toggleRecording,
    submitPreview,
    discardPreview,
  } = useVoiceRecorder(appendTranscript, handleVoiceError);

  const isRecording = recordingState === 'recording';
  const isPreparingAudio = recordingState === 'preparing';
  const isPreviewingAudio = recordingState === 'preview';
  const isTranscribing = recordingState === 'transcribing';
  const isBusy = isPending || isPreparingAudio || isTranscribing || isPreviewingAudio;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        onImageSelect(files);
      }
      e.target.value = '';
    }
  };

  const micTitle = isRecording
    ? t('chat.stopRecording')
    : isPreviewingAudio
      ? t('chat.reviewRecording')
      : t('chat.startRecording');

  const micButtonClass = isRecording
    ? 'text-dn-error bg-dn-error/10 hover:bg-dn-error/20 animate-pulse'
    : isPreparingAudio || isTranscribing || isPreviewingAudio
      ? 'text-dn-primary/40'
      : 'text-dn-text-main/60 hover:text-dn-primary hover:bg-dn-primary/10';

  return (
    <div className="p-4 border-t border-dn-border/10 mt-auto">
      {isTranscribing && (
        <p className="text-[10px] text-dn-primary/40 uppercase tracking-[0.2em] font-black px-1 pb-2">
          {t('chat.transcribing')}
        </p>
      )}
      {isPreparingAudio && (
        <p className="text-[10px] text-dn-primary/40 uppercase tracking-[0.2em] font-black px-1 pb-2">
          {t('chat.preparingAudio')}
        </p>
      )}
      {isPreviewingAudio && previewAudioUrl && (
        <div className="mb-3 p-3 rounded-2xl border border-dn-border/20 bg-dn-surface-low">
          <p className="text-[10px] text-dn-primary/60 uppercase tracking-[0.2em] font-black px-1 pb-2">
            {t('chat.reviewRecording')}
          </p>

          <audio src={previewAudioUrl} controls className="w-full" />

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={submitPreview}
              disabled={isPending || isPreparingAudio || isTranscribing}
              className="h-9 px-3 rounded-full inline-flex items-center gap-2 text-dn-primary hover:bg-dn-primary/10 disabled:text-dn-text-main/40 disabled:hover:bg-transparent"
            >
              <Icon name="send" className="text-[16px]" />
              <span className="text-xs font-semibold">{t('chat.sendRecording')}</span>
            </button>

            <button
              type="button"
              onClick={discardPreview}
              disabled={isPending || isPreparingAudio || isTranscribing}
              className="h-9 px-3 rounded-full inline-flex items-center gap-2 text-dn-text-main/80 hover:bg-dn-border/20 disabled:text-dn-text-main/40 disabled:hover:bg-transparent"
            >
              <Icon name="delete" className="text-[16px]" />
              <span className="text-xs font-semibold">{t('chat.discardRecording')}</span>
            </button>
          </div>
        </div>
      )}
      <form
        className="flex items-end space-x-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy || isRecording}
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isBusy || isRecording
              ? 'text-dn-text-main/20'
              : 'text-dn-text-main/60 hover:text-dn-primary hover:bg-dn-primary/10'
          }`}
          aria-label={t('chat.uploadImage')}
          title={t('chat.uploadImage')}
        >
          <Icon name="add_photo_alternate" className="text-[20px]" />
        </button>

        {isRecordingSupported && (
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isBusy}
            className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${micButtonClass}`}
            aria-label={micTitle}
            title={micTitle}
          >
            <Icon name={isRecording ? 'mic_off' : 'mic'} className="text-[20px]" />
          </button>
        )}

        <Textarea
          containerClassName="flex-1 min-w-0"
          className="px-4! py-2.5! text-sm transition-all min-h-[44px]! max-h-[200px]! overflow-y-auto bg-transparent!"
          placeholder={t('chat.placeholderAgent')}
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

        <button
          type="submit"
          disabled={(!inputContent.trim() && !hasDraftImages) || isBusy || isRecording}
          className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-colors ${
            (inputContent.trim() || hasDraftImages) && !isBusy && !isRecording
              ? 'text-dn-primary hover:bg-dn-primary/10'
              : 'text-dn-text-main/30'
          }`}
        >
          <Icon name="send" className="text-[18px]" />
        </button>
      </form>
    </div>
  );
}
