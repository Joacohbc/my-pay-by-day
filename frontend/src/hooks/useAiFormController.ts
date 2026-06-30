import { useMemo, useState } from 'react';
import type { FieldPath, FieldValues, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import { mergeFieldTextWithTranscription } from '@/lib/aiAudioText';
import { aiService, type AiTextAction } from '@/services/ai.service';
import type { AiPrompts } from '@/store/aiPromptsStore';
import { useAiPromptsStore } from '@/store/aiPromptsStore';

type AiFieldSemantic = 'name' | 'description';

type AiPromptKey = keyof AiPrompts;

interface AiActionDefinition {
  generateAction: AiTextAction;
  fixAction: AiTextAction;
  suggestAction: AiTextAction;
  generatePromptKey: AiPromptKey;
  fixPromptKey: AiPromptKey;
  suggestPromptKey: AiPromptKey;
}

const AI_ACTIONS_BY_SEMANTIC_FIELD: Record<AiFieldSemantic, AiActionDefinition> = {
  name: {
    generateAction: 'GENERATE_NAME',
    fixAction: 'FIX_NAME_SPELLING',
    suggestAction: 'SUGGEST_NAME_FROM_SIMILAR',
    generatePromptKey: 'generateName',
    fixPromptKey: 'fixNameSpelling',
    suggestPromptKey: 'suggestNameFromSimilar',
  },
  description: {
    generateAction: 'GENERATE_DESCRIPTION',
    fixAction: 'FIX_DESCRIPTION_SPELLING',
    suggestAction: 'SUGGEST_DESCRIPTION_FROM_SIMILAR',
    generatePromptKey: 'generateDescription',
    fixPromptKey: 'fixDescriptionSpelling',
    suggestPromptKey: 'suggestDescriptionFromSimilar',
  },
};

/** Optional grounding so SUGGEST_*_FROM_SIMILAR can filter the user's similar past events. */
export interface AiSimilarGrounding {
  categoryId?: number;
  amount?: number;
}

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
  getSimilarGrounding?: () => AiSimilarGrounding;
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
  suggestForActiveField: () => Promise<void>;
  applyTranscriptionToActiveField: (transcription: string) => void;
}

export function useAiFormController<T extends FieldValues>({
  fields,
  getValues,
  setValue,
  buildContext,
  getSimilarGrounding,
  shouldDirty = true,
}: UseAiFormControllerParams<T>): AiFormController {
  const { t } = useTranslation();
  const alert = useAlert();
  const [loadingByField, setLoadingByField] = useState<Record<string, boolean>>({});
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>(fields[0]?.key ?? '');

  const activeFieldKey = useMemo(() => {
    if (fields.length === 0) return '';
    const isSelectedFieldValid = fields.some((field) => field.key === selectedFieldKey);
    return isSelectedFieldValid ? selectedFieldKey : fields[0].key;
  }, [selectedFieldKey, fields]);

  const setActiveFieldKey = setSelectedFieldKey;

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

  const getPromptForAction = useAiPromptsStore((s) => s.getPromptForAction);

  const ACTION_BY_MODE = {
    generate: (c: AiActionDefinition) => ({ action: c.generateAction, promptKey: c.generatePromptKey }),
    fix: (c: AiActionDefinition) => ({ action: c.fixAction, promptKey: c.fixPromptKey }),
    suggest: (c: AiActionDefinition) => ({ action: c.suggestAction, promptKey: c.suggestPromptKey }),
  } as const;

  const runActionForActiveField = async (mode: 'generate' | 'fix' | 'suggest') => {
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

    const { action, promptKey } = ACTION_BY_MODE[mode](actionConfig);
    const grounding = mode === 'suggest' ? getSimilarGrounding?.() : undefined;

    try {
      const result = await aiService.generateText({
        action,
        context: buildContext(),
        currentValue: mode === 'fix' ? currentValue : undefined,
        customPrompt: getPromptForAction(promptKey),
        categoryId: grounding?.categoryId,
        amount: grounding?.amount,
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
    suggestForActiveField: () => runActionForActiveField('suggest'),
    applyTranscriptionToActiveField,
  };
}
