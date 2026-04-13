import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { IconPicker } from '@/components/ui/IconPicker';
import { AiFieldActions } from '@/components/ui/AiFieldActions';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
import { mergeFieldTextWithTranscription } from '@/lib/aiAudioText';
import { aiService } from '@/services/ai.service';
import { aiPromptsStore } from '@/store/aiPromptsStore';
import { useAlert } from '@/contexts/AlertContext';
import type { Category } from '@/models';

interface CategoryFormValues {
  name: string;
  description: string;
  icon: string;
}

interface CategoryFormProps {
  editTarget?: Category | null;
  onSuccess?: (category: Category) => void;
  onCancel?: () => void;
}

export function CategoryForm({ editTarget, onSuccess, onCancel }: CategoryFormProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isDescriptionLoading, setIsDescriptionLoading] = useState(false);

  const { register, handleSubmit, control, getValues, setValue, formState: { errors } } = useForm<CategoryFormValues>({
    defaultValues: {
      name: editTarget?.name ?? '',
      description: editTarget?.description ?? '',
      icon: editTarget?.icon ?? '',
    },
  });

  const buildContext = () => {
    const values = getValues();
    const parts: string[] = ['Entity type: Category (budget classification bucket)'];
    if (values.name) parts.push(`Name: ${values.name}`);
    if (values.description) parts.push(`Description: ${values.description}`);
    return parts.join('\n');
  };

  const handleGenerateName = async () => {
    setIsNameLoading(true);
    try {
      const result = await aiService.generateText({
        action: 'GENERATE_NAME',
        context: buildContext(),
        customPrompt: aiPromptsStore.getPromptForAction('generateName'),
      });
      setValue('name', result.text);
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
        context: buildContext(),
        currentValue: currentName,
        customPrompt: aiPromptsStore.getPromptForAction('fixNameSpelling'),
      });
      setValue('name', result.text);
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
        context: buildContext(),
        customPrompt: aiPromptsStore.getPromptForAction('generateDescription'),
      });
      setValue('description', result.text);
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
        context: buildContext(),
        currentValue: currentDescription,
        customPrompt: aiPromptsStore.getPromptForAction('fixDescriptionSpelling'),
      });
      setValue('description', result.text);
    } catch (err) {
      alert.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsDescriptionLoading(false);
    }
  };

  const handleNameTranscription = (transcription: string) => {
    const currentName = getValues('name');
    setValue('name', mergeFieldTextWithTranscription(currentName, transcription));
  };

  const handleDescriptionTranscription = (transcription: string) => {
    const currentDescription = getValues('description');
    setValue('description', mergeFieldTextWithTranscription(currentDescription, transcription));
  };

  const onSubmit = async (values: CategoryFormValues, e?: React.BaseSyntheticEvent) => {
    e?.stopPropagation();
    try {
      if (editTarget) {
        const updated = await updateCategory.mutateAsync({ id: editTarget.id, dto: values });
        onSuccess?.(updated as unknown as Category);
      } else {
        const created = await createCategory.mutateAsync(values);
        onSuccess?.(created as unknown as Category);
      }
    } catch (error) {
       console.error(error);
    }
  };

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }}
      className="space-y-4"
    >
      <Input
        label={t('common.name')}
        labelRight={
          <AiFieldActions
            onGenerate={handleGenerateName}
            onFixSpelling={handleFixNameSpelling}
            onTranscribe={handleNameTranscription}
            isLoading={isNameLoading}
          />
        }
        placeholder={t('categories.namePlaceholder')}
        error={errors.name?.message}
        {...register('name', { required: t('common.nameRequired') })}
      />
      <Textarea
        label={t('common.description')}
        labelRight={
          <AiFieldActions
            onGenerate={handleGenerateDescription}
            onFixSpelling={handleFixDescriptionSpelling}
            onTranscribe={handleDescriptionTranscription}
            isLoading={isDescriptionLoading}
          />
        }
        placeholder={t('categories.descriptionPlaceholder')}
        {...register('description')}
      />
      <Controller
        name="icon"
        control={control}
        render={({ field }) => (
          <IconPicker
            label={t('categories.iconLabel')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <div className="pt-2 flex gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" fullWidth loading={isSubmitting}>
          {editTarget ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
