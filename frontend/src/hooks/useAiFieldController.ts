import { useState } from 'react';
import type { FieldPath, FieldValues, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import { audioService } from '@/services/audio.service';
import { logger } from '@/lib/logger';

interface UseAiFieldControllerParams<T extends FieldValues> {
  name: FieldPath<T>;
  getValues: UseFormGetValues<T>;
  setValue: UseFormSetValue<T>;
  allowVoice?: boolean;
  shouldDirty?: boolean;
}

export interface AiFieldController {
  isLoading: boolean;
  allowVoice: boolean;
  /** Records voice as spoken intent and lets the fast model rewrite/apply it over the current field value. */
  applyEnhancedDictation: (audioBlob: Blob) => Promise<void>;
}

export function useAiFieldController<T extends FieldValues>({
  name,
  getValues,
  setValue,
  allowVoice = false,
  shouldDirty = true,
}: UseAiFieldControllerParams<T>): AiFieldController {
  const { t } = useTranslation();
  const alert = useAlert();
  const [isLoading, setIsLoading] = useState(false);

  const getFieldValueAsString = (): string => {
    const currentValue = getValues(name);
    if (typeof currentValue === 'string') return currentValue;
    if (currentValue === undefined || currentValue === null) return '';
    return String(currentValue);
  };

  const applyEnhancedDictation = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const { transcription } = await audioService.transcribeRecordedAudioEnhanced(audioBlob, getFieldValueAsString());
      const editedText = transcription.trim();
      if (!editedText) throw new Error('transcription_failed');
      setValue(name, editedText as never, { shouldDirty });
    } catch (error) {
      logger.child('aiField').error('Enhanced dictation failed', { error, field: name });
      alert.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    allowVoice,
    applyEnhancedDictation,
  };
}
