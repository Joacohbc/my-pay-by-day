import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { AiFieldActions } from '@/components/ui/AiFieldActions';
import { mergeFieldTextWithTranscription } from '@/lib/aiAudioText';
import { aiService } from '@/services/ai.service';
import { aiPromptsStore } from '@/store/aiPromptsStore';
import { useAlert } from '@/contexts/AlertContext';
import type { FormValues } from '@/components/events/EventFormMapper';

export function BasicInfoFields() {
  const { t } = useTranslation();
  const alert = useAlert();
  const { register, getValues, setValue, formState: { errors } } = useFormContext<FormValues>();

  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isDescriptionLoading, setIsDescriptionLoading] = useState(false);

  const buildEventContext = () => {
    const values = getValues();
    const parts: string[] = [];
    if (values.name) parts.push(`Name: ${values.name}`);
    if (values.description) parts.push(`Description: ${values.description}`);
    if (values.type) parts.push(`Type: ${values.type}`);
    return parts.join('\n');
  };

  const handleGenerateName = async () => {
    setIsNameLoading(true);
    try {
      const result = await aiService.generateText({
        action: 'GENERATE_NAME',
        context: buildEventContext(),
        customPrompt: aiPromptsStore.getPromptForAction('generateName'),
      });
      setValue('name', result.text, { shouldDirty: true });
    } catch (err) {
      alert.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsNameLoading(false);
    }
  };

  const handleFixNameSpelling = async () => {
    const currentName = getValues('name');
    if (!currentName) return;
    setIsNameLoading(true);
    try {
      const result = await aiService.generateText({
        action: 'FIX_NAME_SPELLING',
        context: buildEventContext(),
        currentValue: currentName,
        customPrompt: aiPromptsStore.getPromptForAction('fixNameSpelling'),
      });
      setValue('name', result.text, { shouldDirty: true });
    } catch (err) {
      alert.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsNameLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    setIsDescriptionLoading(true);
    try {
      const result = await aiService.generateText({
        action: 'GENERATE_DESCRIPTION',
        context: buildEventContext(),
        customPrompt: aiPromptsStore.getPromptForAction('generateDescription'),
      });
      setValue('description', result.text, { shouldDirty: true });
    } catch (err) {
      alert.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsDescriptionLoading(false);
    }
  };

  const handleFixDescriptionSpelling = async () => {
    const currentDescription = getValues('description');
    if (!currentDescription) return;
    setIsDescriptionLoading(true);
    try {
      const result = await aiService.generateText({
        action: 'FIX_DESCRIPTION_SPELLING',
        context: buildEventContext(),
        currentValue: currentDescription,
        customPrompt: aiPromptsStore.getPromptForAction('fixDescriptionSpelling'),
      });
      setValue('description', result.text, { shouldDirty: true });
    } catch (err) {
      alert.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsDescriptionLoading(false);
    }
  };

  const handleNameTranscription = (transcription: string) => {
    const currentName = getValues('name') ?? '';
    const nextName = mergeFieldTextWithTranscription(currentName, transcription);
    setValue('name', nextName, { shouldDirty: true });
  };

  const handleDescriptionTranscription = (transcription: string) => {
    const currentDescription = getValues('description') ?? '';
    const nextDescription = mergeFieldTextWithTranscription(currentDescription, transcription);
    setValue('description', nextDescription, { shouldDirty: true });
  };

  return (
    <>
      <Input
        label={t('eventForm.eventName')}
        labelRight={
          <AiFieldActions
            onGenerate={handleGenerateName}
            onFixSpelling={handleFixNameSpelling}
            onTranscribe={handleNameTranscription}
            isLoading={isNameLoading}
          />
        }
        placeholder={t('eventForm.eventNamePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea
        label={t('eventForm.description')}
        labelRight={
          <AiFieldActions
            onGenerate={handleGenerateDescription}
            onFixSpelling={handleFixDescriptionSpelling}
            onTranscribe={handleDescriptionTranscription}
            isLoading={isDescriptionLoading}
          />
        }
        placeholder={t('eventForm.descriptionPlaceholder')}
        {...register('description')}
      />
    </>
  );
}
