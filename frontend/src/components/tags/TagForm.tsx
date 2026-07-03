import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useCreateTag, useUpdateTag } from '@/hooks/useTags';
import { useAiFieldController } from '@/hooks/useAiFieldController';
import type { Tag } from '@/models';

interface TagFormValues {
  name: string;
  description: string;
}

interface TagFormProps {
  editTarget?: Tag | null;
  onSuccess?: (tag: Tag) => void;
  onCancel?: () => void;
}

export function TagForm({ editTarget, onSuccess, onCancel }: TagFormProps) {
  const { t } = useTranslation();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();

  const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<TagFormValues>({
    defaultValues: {
      name: editTarget?.name ?? '',
      description: editTarget?.description ?? '',
    },
  });

  const buildContext = () => {
    const values = getValues();
    const parts: string[] = ['Entity type: Tag (transversal label for grouping events)'];
    if (values.name) parts.push(`Name: ${values.name}`);
    if (values.description) parts.push(`Description: ${values.description}`);
    return parts.join('\n');
  };

  const nameAi = useAiFieldController<TagFormValues>({
    name: 'name',
    semantic: 'name',
    getValues,
    setValue,
    buildContext,
    allowVoice: true,
  });

  const descriptionAi = useAiFieldController<TagFormValues>({
    name: 'description',
    semantic: 'description',
    getValues,
    setValue,
    buildContext,
    allowVoice: true,
  });

  const onSubmit = async (values: TagFormValues, e?: React.BaseSyntheticEvent) => {
    e?.stopPropagation();
    try {
      if (editTarget) {
        const updated = await updateTag.mutateAsync({ id: editTarget.id, dto: values });
        onSuccess?.(updated as unknown as Tag);
      } else {
        const created = await createTag.mutateAsync(values);
        onSuccess?.(created as unknown as Tag);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const isSubmitting = createTag.isPending || updateTag.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }}
      className="space-y-4"
    >
      <Input
        label={t('tags.tagName')}
        placeholder={t('tags.namePlaceholder')}
        error={errors.name?.message}
        {...register('name', { required: t('common.nameRequired') })}
        ai={nameAi}
      />
      <Textarea
        label={t('common.description')}
        placeholder={t('tags.descriptionPlaceholder')}
        {...register('description')}
        ai={descriptionAi}
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
