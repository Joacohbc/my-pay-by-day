import { useEffect, useMemo, useState } from 'react';
import type { FieldPath, FieldValues, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import { mergeFieldTextWithTranscription } from '@/lib/aiAudioText';
import { aiService, type AiTextAction } from '@/services/ai.service';
import type { AiPrompts } from '@/store/aiPromptsStore';
import { aiPromptsStore } from '@/store/aiPromptsStore';

type AiFieldSemantic = 'name' | 'description';

type AiPromptKey = keyof AiPrompts;

interface AiActionDefinition {
  generateAction: AiTextAction;
  fixAction: AiTextAction;
  generatePromptKey: AiPromptKey;
  fixPromptKey: AiPromptKey;
}

const AI_ACTIONS_BY_SEMANTIC_FIELD: Record<AiFieldSemantic, AiActionDefinition> = {
  name: {
    generateAction: 'GENERATE_NAME',
    fixAction: 'FIX_NAME_SPELLING',
    generatePromptKey: 'generateName',
    fixPromptKey: 'fixNameSpelling',
  },
  description: {
    generateAction: 'GENERATE_DESCRIPTION',
    fixAction: 'FIX_DESCRIPTION_SPELLING',
    generatePromptKey: 'generateDescription',
    fixPromptKey: 'fixDescriptionSpelling',
  },
};

export interface AiFormFieldConfig<T extends FieldValues> {
  key: string;
  name: FieldPath<T>;
  label: string;
  semantic: AiFieldSemantic;
  allowVoice?: boolean;
}

interface UseAiFormControllerParams<T extends FieldValues> {
  fields: AiFormFieldConfig<T>[];
  getValues: UseFormGetValues<T>;
  setValue: UseFormSetValue<T>;
  buildContext: () => string;
  shouldDirty?: boolean;
}

export interface AiFormController {
  fields: Array<{ key: string; label: string; allowVoice: boolean }>;
  activeFieldKey: string;
  activeFieldLabel: string;
  setActiveFieldKey: (fieldKey: string) => void;
  markFieldAsActive: (fieldKey: string) => void;
  isFieldLoading: (fieldKey: string) => boolean;
  isAnyLoading: boolean;
  isActiveFieldLoading: boolean;
  canFixActiveField: boolean;
  canUseVoiceOnActiveField: boolean;
  generateForActiveField: () => Promise<void>;
  fixSpellingForActiveField: () => Promise<void>;
  applyTranscriptionToActiveField: (transcription: string) => void;
}

export function useAiFormController<T extends FieldValues>({
  fields,
  getValues,
  setValue,
  buildContext,
  shouldDirty = true,
}: UseAiFormControllerParams<T>): AiFormController {
  const { t } = useTranslation();
  const alert = useAlert();
  const [loadingByField, setLoadingByField] = useState<Record<string, boolean>>({});
  const [activeFieldKey, setActiveFieldKey] = useState<string>(fields[0]?.key ?? '');

  useEffect(() => {
    if (fields.length === 0) {
      if (activeFieldKey !== '') {
        setActiveFieldKey('');
      }
      return;
    }

    const hasActiveField = fields.some((field) => field.key === activeFieldKey);
    if (!hasActiveField) {
      setActiveFieldKey(fields[0].key);
    }
  }, [activeFieldKey, fields]);

  const activeField = useMemo(
    () => fields.find((field) => field.key === activeFieldKey) ?? null,
    [activeFieldKey, fields]
  );

  const getFieldValueAsString = (fieldName: FieldPath<T>): string => {
    const currentValue = getValues(fieldName);
    if (typeof currentValue === 'string') {
      return currentValue;
    }
    if (currentValue === undefined || currentValue === null) {
      return '';
    }
    return String(currentValue);
  };

  const updateFieldValue = (fieldName: FieldPath<T>, nextValue: string) => {
    setValue(fieldName, nextValue as never, { shouldDirty });
  };

  const runActionForActiveField = async (mode: 'generate' | 'fix') => {
    if (!activeField) {
      return;
    }

    const actionConfig = AI_ACTIONS_BY_SEMANTIC_FIELD[activeField.semantic];
    const currentValue = getFieldValueAsString(activeField.name);

    if (mode === 'fix' && currentValue.trim().length === 0) {
      return;
    }

    setLoadingByField((previousLoadingByField) => ({
      ...previousLoadingByField,
      [activeField.key]: true,
    }));

    try {
      const result = await aiService.generateText({
        action: mode === 'generate' ? actionConfig.generateAction : actionConfig.fixAction,
        context: buildContext(),
        currentValue: mode === 'fix' ? currentValue : undefined,
        customPrompt: aiPromptsStore.getPromptForAction(
          mode === 'generate' ? actionConfig.generatePromptKey : actionConfig.fixPromptKey
        ),
      });

      updateFieldValue(activeField.name, result.text);
    } catch (error) {
      alert.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setLoadingByField((previousLoadingByField) => ({
        ...previousLoadingByField,
        [activeField.key]: false,
      }));
    }
  };

  const applyTranscriptionToActiveField = (transcription: string) => {
    if (!activeField || !activeField.allowVoice) {
      return;
    }

    const currentValue = getFieldValueAsString(activeField.name);
    const nextValue = mergeFieldTextWithTranscription(currentValue, transcription);
    updateFieldValue(activeField.name, nextValue);
  };

  const activeFieldValue = activeField ? getFieldValueAsString(activeField.name) : '';
  const isAnyLoading = Object.values(loadingByField).some(Boolean);

  return {
    fields: fields.map((field) => ({
      key: field.key,
      label: field.label,
      allowVoice: field.allowVoice ?? false,
    })),
    activeFieldKey,
    activeFieldLabel: activeField?.label ?? '',
    setActiveFieldKey,
    markFieldAsActive: (fieldKey: string) => {
      if (fields.some((field) => field.key === fieldKey)) {
        setActiveFieldKey(fieldKey);
      }
    },
    isFieldLoading: (fieldKey: string) => !!loadingByField[fieldKey],
    isAnyLoading,
    isActiveFieldLoading: activeField ? !!loadingByField[activeField.key] : false,
    canFixActiveField: activeFieldValue.trim().length > 0,
    canUseVoiceOnActiveField: !!activeField?.allowVoice,
    generateForActiveField: () => runActionForActiveField('generate'),
    fixSpellingForActiveField: () => runActionForActiveField('fix'),
    applyTranscriptionToActiveField,
  };
}
