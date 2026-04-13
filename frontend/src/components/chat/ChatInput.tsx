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

const VOICE_ERROR_KEYS: Record<string, string> = {
  voice_not_supported: 'chat.voiceNotSupported',
  microphone_denied: 'chat.microphoneDenied',
  transcription_failed: 'chat.transcriptionFailed',
};

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
    const translationKey = VOICE_ERROR_KEYS[errorKey] ?? 'chat.transcriptionFailed';
    showError(t(translationKey));
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
      : 'text-dn-text-main/60 hover:text-dn-primary hover:bg-dn-primary/10';

  return (
    <div className="p-4 border-t border-dn-border/10 mt-auto">
      {isPreparingAudio && (
        <p className="text-[10px] text-dn-primary/40 uppercase tracking-[0.2em] font-black px-1 pb-2">
          {t('chat.transcribing')}
        </p>
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
