import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useCreateTag, useUpdateTag } from '@/hooks/useTags';
import { useAiFieldController } from '@/hooks/useAiFieldController';
import { FormPatchAiChatWidget } from '@/components/ui/FormPatchAiChatWidget';
import type { Tag } from '@/models';

interface TagFormValues {
  name: string;
  description: string;
  color: string;
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

  const { register, handleSubmit, control, getValues, setValue, formState: { errors } } = useForm<TagFormValues>({
    defaultValues: {
      name: editTarget?.name ?? '',
      description: editTarget?.description ?? '',
      color: editTarget?.color ?? '',
    },
  });

  const nameAi = useAiFieldController<TagFormValues>({
    name: 'name',
    getValues,
    setValue,
    allowVoice: true,
  });

  const descriptionAi = useAiFieldController<TagFormValues>({
    name: 'description',
    getValues,
    setValue,
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
    } catch {
      // Save failure is shipped by the global mutation logger; the mutation surfaces it in the UI.
    }
  };

  const isSubmitting = createTag.isPending || updateTag.isPending;

  const applyPatch = (patch: Record<string, unknown>) => {
    if (typeof patch.name === 'string') setValue('name', patch.name, { shouldDirty: true });
    if (typeof patch.description === 'string') setValue('description', patch.description, { shouldDirty: true });
    if (typeof patch.color === 'string') setValue('color', patch.color, { shouldDirty: true });
  };

  return (
    <>
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
      <Controller
        name="color"
        control={control}
        render={({ field }) => (
          <ColorPicker
            label={t('common.colorLabel')}
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
    <FormPatchAiChatWidget
      entityType="tag"
      getCurrentValues={() => getValues() as unknown as Record<string, unknown>}
      onPatch={applyPatch}
    />
    </>
  );
}
