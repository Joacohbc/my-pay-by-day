import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useAlert } from '@/contexts/AlertContext';
import type { AiFormController } from '@/hooks/useAiFormController';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { audioService } from '@/services/audio.service';

interface AiFormActionsFabProps {
  controller: AiFormController;
}

export function AiFormActionsFab({ controller }: AiFormActionsFabProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleVoiceError = useCallback((errorKey: string) => {
    if (errorKey === 'voice_not_supported') {
      alert.error(t('chat.voiceNotSupported'));
      return;
    }

    if (errorKey === 'microphone_denied') {
      alert.error(t('chat.microphoneDenied'));
      return;
    }

    alert.error(t('chat.transcriptionFailed'));
  }, [alert, t]);

  const handleTranscriptionReady = useCallback(async (recordedAudioBlob: Blob) => {
    const transcriptionResponse = await audioService.transcribeRecordedAudio(recordedAudioBlob);
    const transcriptionText = transcriptionResponse.transcription.trim();

    if (!transcriptionText) {
      throw new Error('transcription_failed');
    }

    controller.applyTranscriptionToActiveField(transcriptionText);
  }, [controller]);

  const {
    recordingState,
    isRecordingSupported,
    toggleRecording,
  } = useVoiceRecorder(handleTranscriptionReady, handleVoiceError);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (controller.fields.length === 0) {
    return null;
  }

  const isRecordingAudio = recordingState === 'recording';
  const isPreparingAudio = recordingState === 'preparing';
  const canUseVoiceInActiveField = controller.canUseVoiceOnActiveField && isRecordingSupported;
  const shouldRenderVoiceAction = isRecordingAudio || canUseVoiceInActiveField;

  const isActionsDisabled = controller.isAnyLoading || isRecordingAudio || isPreparingAudio;
  const isVoiceToggleDisabled =
    controller.isAnyLoading ||
    isPreparingAudio ||
    (!canUseVoiceInActiveField && !isRecordingAudio);

  const voiceActionTitle = isRecordingAudio
    ? t('ai.actions.stopVoiceInput')
    : isPreparingAudio
      ? t('chat.transcribing')
      : t('ai.actions.voiceInput');

  return (
    <div className="fixed bottom-24 left-5 z-50" ref={menuRef}>
      {isOpen && (
        <div className="absolute bottom-14 left-0 w-64 rounded-card bg-dn-surface border border-white/10 shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10">
            <label htmlFor="ai-target-field" className="text-[11px] font-medium uppercase tracking-wider text-dn-text-muted">
              {t('ai.actions.targetField')}
            </label>
            <select
              id="ai-target-field"
              value={controller.activeFieldKey}
              onChange={(event) => controller.setActiveFieldKey(event.target.value)}
              className="mt-1 w-full bg-dn-surface-low rounded-input px-3 py-2 text-sm text-dn-text-main focus:outline-none focus:ring-2 focus:ring-dn-primary/30"
            >
              {controller.fields.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          <div className="p-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                void controller.generateForActiveField();
              }}
              disabled={isActionsDisabled}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg text-dn-text-main hover:bg-dn-surface-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="draw" className="text-base text-dn-primary" />
              {t('ai.actions.generate')}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                void controller.fixSpellingForActiveField();
              }}
              disabled={isActionsDisabled || !controller.canFixActiveField}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg text-dn-text-main hover:bg-dn-surface-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="spellcheck" className="text-base text-dn-primary" />
              {t('ai.actions.fixSpelling')}
            </button>

            {shouldRenderVoiceAction && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isVoiceToggleDisabled}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg text-dn-text-main hover:bg-dn-surface-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={voiceActionTitle}
              >
                {isPreparingAudio ? (
                  <Spinner size="sm" />
                ) : (
                  <Icon
                    name={isRecordingAudio ? 'mic_off' : 'mic'}
                    className={isRecordingAudio ? 'text-base text-dn-error' : 'text-base text-dn-primary'}
                  />
                )}
                {isRecordingAudio ? t('ai.actions.stopVoiceInput') : t('ai.actions.voiceInput')}
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((previousIsOpen) => !previousIsOpen)}
        disabled={isActionsDisabled}
        className="h-8 w-8 p-6 rounded-full bg-dn-primary text-white shadow-lg shadow-dn-primary/25 flex items-center justify-center hover:bg-dn-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={t('ai.actions.title')}
        aria-label={t('ai.actions.title')}
      >
        {controller.isActiveFieldLoading || isPreparingAudio ? (
          <Spinner size="sm" />
        ) : (
          <Icon name="auto_awesome" className="text-lg" />
        )}
      </button>
    </div>
  );
}
