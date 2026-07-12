import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useAlert } from '@/contexts/AlertContext';
import type { AiFieldController } from '@/hooks/useAiFieldController';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface AiFieldControlsProps {
  controller: AiFieldController;
}

export function AiFieldControls({ controller }: AiFieldControlsProps) {
  const { t } = useTranslation();
  const alert = useAlert();

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

  const handleAudioReady = useCallback(
    (recordedAudioBlob: Blob) => controller.applyEnhancedDictation(recordedAudioBlob),
    [controller],
  );

  const {
    recordingState,
    isRecordingSupported,
    permissionState,
    requestPermission,
    toggleRecording,
  } = useVoiceRecorder(handleAudioReady, handleVoiceError);

  const isRecordingAudio = recordingState === 'recording';
  const isPreparingAudio = recordingState === 'preparing';
  const isBusy = controller.isLoading || isPreparingAudio;

  if (!controller.allowVoice || !isRecordingSupported) return null;

  const handleClick = () => {
    if (isRecordingAudio) {
      toggleRecording();
      return;
    }
    if (permissionState !== 'granted') {
      void requestPermission();
      return;
    }
    toggleRecording();
  };

  const title = isRecordingAudio ? t('ai.actions.stopSmartDictation') : t('ai.actions.smartDictation');

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy && !isRecordingAudio}
        className="h-5 w-5 flex items-center justify-center rounded text-dn-text-muted hover:text-dn-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={title}
        aria-label={title}
      >
        {isBusy ? (
          <Spinner size="sm" />
        ) : (
          <Icon name="auto_fix_high" className={isRecordingAudio ? 'text-sm text-dn-error animate-pulse' : 'text-sm'} />
        )}
      </button>
    </div>
  );
}
