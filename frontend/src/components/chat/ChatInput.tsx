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
  onAudioRecorded: (audioBlob: Blob) => Promise<void>;
  onImageSelect: (files: File[]) => void;
  isPending?: boolean;
  hasDraftImages?: boolean;
}

export function ChatInput({
  inputContent,
  setInputContent,
  onSend,
  onAudioRecorded,
  onImageSelect,
  isPending,
  hasDraftImages,
}: ChatInputProps) {
  const { t } = useTranslation();
  const { error: showError } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  } = useVoiceRecorder(onAudioRecorded, handleVoiceError);

  const isRecording = recordingState === 'recording';
  const isPreparingAudio = recordingState === 'preparing';
  const isBusy = isPending || isPreparingAudio;

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
    : isPreparingAudio
      ? t('chat.transcribing')
      : t('chat.startRecording');

  const micButtonClass = isRecording
    ? 'text-dn-error bg-dn-error/10 hover:bg-dn-error/20 animate-pulse'
    : isPreparingAudio
      ? 'text-dn-primary/40'
      : 'text-dn-text-main/50 hover:text-dn-primary hover:bg-dn-primary/10';

  const canSend = (inputContent.trim() || hasDraftImages) && !isBusy && !isRecording;

  return (
    <div className="px-3 pb-3 pt-2 mt-auto">
      {isPreparingAudio && (
        <p className="text-[10px] text-dn-primary/40 uppercase tracking-[0.2em] font-black px-1 pb-2">
          {t('chat.transcribing')}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

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

        {/* Action bar */}
        <div className="flex items-center justify-between px-2 pb-2 gap-2">
          {/* Left: media actions */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy || isRecording}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                isBusy || isRecording
                  ? 'text-dn-text-main/20'
                  : 'text-dn-text-main/50 hover:text-dn-primary hover:bg-dn-primary/10'
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
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${micButtonClass}`}
                aria-label={micTitle}
                title={micTitle}
              >
                <Icon name={isRecording ? 'mic_off' : 'mic'} className="text-[20px]" />
              </button>
            )}
          </div>

          {/* Right: send */}
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
      </form>
    </div>
  );
}
