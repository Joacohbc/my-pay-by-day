import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useAlert } from '@/contexts/AlertContext';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { audioService } from '@/services/audio.service';

export const AiIcon = () => <Icon name="auto_awesome" />;

export type IAActionEventType = 'generate' | 'fixSpelling' | 'voiceInput';

export interface IAActionEvent {
  type: IAActionEventType;
  transcription?: string;
}

interface AiFieldActionsProps {
  onGenerate: () => void | Promise<void>;
  onFixSpelling: () => void | Promise<void>;
  onTranscribe?: (transcription: string) => void | Promise<void>;
  onActionEvent?: (event: IAActionEvent) => void;
  isLoading: boolean;
}

const VOICE_ERROR_KEYS: Record<string, string> = {
  voice_not_supported: 'chat.voiceNotSupported',
  microphone_denied: 'chat.microphoneDenied',
  transcription_failed: 'chat.transcriptionFailed',
};

export function AiFieldActions({ onGenerate, onFixSpelling, onTranscribe, onActionEvent, isLoading }: AiFieldActionsProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleVoiceError = useCallback((errorKey: string) => {
    const translationKey = VOICE_ERROR_KEYS[errorKey] ?? 'chat.transcriptionFailed';
    alert.error(t(translationKey));
  }, [alert, t]);

  const handleTranscriptionReady = useCallback(async (recordedAudioBlob: Blob) => {
    if (!onTranscribe) {
      return;
    }

    const transcriptionResponse = await audioService.transcribeRecordedAudio(recordedAudioBlob);
    const transcriptionText = transcriptionResponse.transcription.trim();

    if (!transcriptionText) {
      throw new Error('transcription_failed');
    }

    await onTranscribe(transcriptionText);
    onActionEvent?.({ type: 'voiceInput', transcription: transcriptionText });
  }, [onActionEvent, onTranscribe]);

  const {
    recordingState,
    isRecordingSupported,
    toggleRecording,
  } = useVoiceRecorder(handleTranscriptionReady, handleVoiceError);

  const isRecordingAudio = recordingState === 'recording';
  const isPreparingAudio = recordingState === 'preparing';
  const isActionMenuDisabled = isLoading || isRecordingAudio || isPreparingAudio;
  const isVoiceToggleDisabled = isLoading || isPreparingAudio;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (actionType: IAActionEventType, action: () => void | Promise<void>) => {
    setIsOpen(false);
    onActionEvent?.({ type: actionType });
    void action();
  };

  const voiceActionTitle = isRecordingAudio
    ? t('ai.actions.stopVoiceInput')
    : isPreparingAudio
      ? t('chat.transcribing')
      : t('ai.actions.voiceInput');

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen((previousIsOpen) => !previousIsOpen)}
          disabled={isActionMenuDisabled}
          className="flex items-center gap-1 text-xs text-dn-primary/70 hover:text-dn-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('ai.actions.title')}
        >
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            <Icon name="auto_awesome" className="text-sm" />
          )}
          <span className="font-medium uppercase tracking-wider">{t('ai.actions.label')}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-40 rounded-xl bg-dn-surface border border-white/10 shadow-xl overflow-hidden">
            <button
              type="button"
              onClick={() => handleAction('generate', onGenerate)}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-dn-text-main hover:bg-dn-surface-low transition-colors"
              disabled={isActionMenuDisabled}
            >
              <Icon name="draw" className="text-base text-dn-primary" />
              {t('ai.actions.generate')}
            </button>
            <button
              type="button"
              onClick={() => handleAction('fixSpelling', onFixSpelling)}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-dn-text-main hover:bg-dn-surface-low transition-colors"
              disabled={isActionMenuDisabled}
            >
              <Icon name="spellcheck" className="text-base text-dn-primary" />
              {t('ai.actions.fixSpelling')}
            </button>
          </div>
        )}
      </div>

      {onTranscribe && isRecordingSupported && (
        <button
          type="button"
          onClick={toggleRecording}
          disabled={isVoiceToggleDisabled}
          className={`flex items-center justify-center h-7 w-7 rounded-full transition-colors ${isRecordingAudio
            ? 'text-dn-error bg-dn-error/10 hover:bg-dn-error/20'
            : isPreparingAudio
              ? 'text-dn-primary/40'
              : 'text-dn-primary/70 hover:text-dn-primary hover:bg-dn-primary/10'
          }`}
          title={voiceActionTitle}
          aria-label={voiceActionTitle}
        >
          {isPreparingAudio ? (
            <Spinner size="sm" />
          ) : (
            <Icon name={isRecordingAudio ? 'mic_off' : 'mic'} className="text-sm" />
          )}
        </button>
      )}
    </div>
  );
}
