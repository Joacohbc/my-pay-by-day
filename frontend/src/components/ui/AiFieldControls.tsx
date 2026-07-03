import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useAlert } from '@/contexts/AlertContext';
import type { AiFieldController } from '@/hooks/useAiFieldController';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { audioService } from '@/services/audio.service';

interface AiFieldControlsProps {
  controller: AiFieldController;
}

type RecordingMode = 'dictate' | 'instruct';

export function AiFieldControls({ controller }: AiFieldControlsProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const [activeRecordingMode, setActiveRecordingMode] = useState<RecordingMode>('dictate');
  const recordingModeRef = useRef<RecordingMode>('dictate');

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

  const handleAudioReady = useCallback(async (recordedAudioBlob: Blob) => {
    const transcriptionResponse = await audioService.transcribeRecordedAudio(recordedAudioBlob);
    const transcriptionText = transcriptionResponse.transcription.trim();

    if (!transcriptionText) {
      throw new Error('transcription_failed');
    }

    if (recordingModeRef.current === 'instruct') {
      await controller.applyInstruction(transcriptionText);
    } else {
      controller.applyTranscription(transcriptionText);
    }
  }, [controller, recordingModeRef]);

  const {
    recordingState,
    isRecordingSupported,
    permissionState,
    requestPermission,
    toggleRecording,
  } = useVoiceRecorder(handleAudioReady, handleVoiceError);

  const isRecordingAudio = recordingState === 'recording';
  const isPreparingAudio = recordingState === 'preparing';
  const isBusy = controller.isLoading || isRecordingAudio || isPreparingAudio;
  const canUseVoice = controller.allowVoice && isRecordingSupported;

  const startRecording = (mode: RecordingMode) => {
    recordingModeRef.current = mode;
    setActiveRecordingMode(mode);
    if (permissionState !== 'granted') {
      void requestPermission();
      return;
    }
    toggleRecording();
  };

  const micButton = (mode: RecordingMode, icon: string, titleIdle: string, titleRecording: string) => {
    const isThisMicRecording = isRecordingAudio && activeRecordingMode === mode;
    const isOtherMicRecording = isRecordingAudio && activeRecordingMode !== mode;
    return (
      <button
        type="button"
        onClick={() => (isThisMicRecording ? toggleRecording() : startRecording(mode))}
        disabled={(isBusy && !isThisMicRecording) || isOtherMicRecording}
        className="p-1 rounded text-dn-text-muted hover:text-dn-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={isThisMicRecording ? titleRecording : titleIdle}
        aria-label={isThisMicRecording ? titleRecording : titleIdle}
      >
        {isPreparingAudio && activeRecordingMode === mode ? (
          <Spinner size="sm" />
        ) : (
          <Icon name={icon} className={isThisMicRecording ? 'text-base text-dn-error animate-pulse' : 'text-base'} />
        )}
      </button>
    );
  };

  const aiActionTitle = controller.hasValue ? t('ai.actions.improve') : t('ai.actions.generate');

  return (
    <div className="flex items-center gap-0.5">
      {canUseVoice && micButton('dictate', 'mic', t('ai.actions.voiceInput'), t('ai.actions.stopVoiceInput'))}
      {canUseVoice && micButton('instruct', 'record_voice_over', t('ai.actions.voiceInstruct'), t('ai.actions.stopVoiceInstruct'))}

      <button
        type="button"
        onClick={() => void controller.runAiAction()}
        disabled={isBusy}
        className="p-1 rounded text-dn-text-muted hover:text-dn-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={aiActionTitle}
        aria-label={aiActionTitle}
      >
        {controller.isLoading ? (
          <Spinner size="sm" />
        ) : (
          <Icon name={controller.hasValue ? 'auto_fix_high' : 'auto_awesome'} className="text-base" />
        )}
      </button>
    </div>
  );
}
