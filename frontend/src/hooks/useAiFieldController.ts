import { useState } from 'react';
import type { FieldPath, FieldValues, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import { mergeFieldTextWithTranscription } from '@/lib/aiAudioText';
import { aiService, type AiTextAction } from '@/services/ai.service';

type AiFieldSemantic = 'name' | 'description';

interface AiActionDefinition {
  generateAction: AiTextAction;
  suggestAction: AiTextAction;
}

const AI_ACTIONS_BY_SEMANTIC_FIELD: Record<AiFieldSemantic, AiActionDefinition> = {
  name: {
    generateAction: 'GENERATE_NAME',
    suggestAction: 'SUGGEST_NAME_FROM_SIMILAR',
  },
  description: {
    generateAction: 'GENERATE_DESCRIPTION',
    suggestAction: 'SUGGEST_DESCRIPTION_FROM_SIMILAR',
  },
};

/** Optional grounding so SUGGEST_*_FROM_SIMILAR can filter the user's similar past events. */
export interface AiSimilarGrounding {
  categoryId?: number;
  amount?: number;
}

interface UseAiFieldControllerParams<T extends FieldValues> {
  name: FieldPath<T>;
  semantic: AiFieldSemantic;
  getValues: UseFormGetValues<T>;
  setValue: UseFormSetValue<T>;
  buildContext: () => string;
  getSimilarGrounding?: () => AiSimilarGrounding;
  allowVoice?: boolean;
  shouldDirty?: boolean;
}

export interface AiFieldController {
  isLoading: boolean;
  hasValue: boolean;
  allowVoice: boolean;
  /** Generates text when the field is empty (using similar-event grounding if available), improves it otherwise. */
  runAiAction: () => Promise<void>;
  applyInstruction: (instruction: string) => Promise<void>;
  applyTranscription: (transcription: string) => void;
}

export function useAiFieldController<T extends FieldValues>({
  name,
  semantic,
  getValues,
  setValue,
  buildContext,
  getSimilarGrounding,
  allowVoice = false,
  shouldDirty = true,
}: UseAiFieldControllerParams<T>): AiFieldController {
  const { t } = useTranslation();
  const alert = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const actionConfig = AI_ACTIONS_BY_SEMANTIC_FIELD[semantic];

  const getFieldValueAsString = (): string => {
    const currentValue = getValues(name);
    if (typeof currentValue === 'string') return currentValue;
    if (currentValue === undefined || currentValue === null) return '';
    return String(currentValue);
  };

  const updateFieldValue = (nextValue: string) => {
    setValue(name, nextValue as never, { shouldDirty });
  };

  const runAction = async (
    action: AiTextAction,
    options: { withCurrentValue?: boolean; categoryId?: number; amount?: number; instruction?: string } = {}
  ) => {
    const currentValue = getFieldValueAsString();
    setIsLoading(true);
    try {
      const result = await aiService.generateText({
        action,
        context: buildContext(),
        currentValue: options.withCurrentValue ? currentValue : undefined,
        categoryId: options.categoryId,
        amount: options.amount,
        instruction: options.instruction,
      });
      updateFieldValue(result.text);
    } catch (error) {
      alert.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const hasValue = getFieldValueAsString().trim().length > 0;

  const runAiAction = () => {
    const grounding = getSimilarGrounding?.();

    if (hasValue) {
      return runAction('IMPROVE_TEXT', {
        withCurrentValue: true,
        categoryId: grounding?.categoryId,
        amount: grounding?.amount,
      });
    }

    if (grounding?.categoryId != null || grounding?.amount != null) {
      return runAction(actionConfig.suggestAction, {
        categoryId: grounding.categoryId,
        amount: grounding.amount,
      });
    }

    return runAction(actionConfig.generateAction);
  };

  return {
    isLoading,
    hasValue,
    allowVoice,
    runAiAction,
    applyInstruction: (instruction: string) =>
      runAction('APPLY_INSTRUCTIONS', { withCurrentValue: true, instruction }),
    applyTranscription: (transcription: string) => {
      const nextValue = mergeFieldTextWithTranscription(getFieldValueAsString(), transcription);
      updateFieldValue(nextValue);
    },
  };
}
