import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { IconPicker } from '@/components/ui/IconPicker';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
import { useAiFieldController } from '@/hooks/useAiFieldController';
import { FormPatchAiChatWidget } from '@/components/ui/FormPatchAiChatWidget';
import type { Category } from '@/models';

interface CategoryFormValues {
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface CategoryFormProps {
  editTarget?: Category | null;
  onSuccess?: (category: Category) => void;
  onCancel?: () => void;
}

export function CategoryForm({ editTarget, onSuccess, onCancel }: CategoryFormProps) {
  const { t } = useTranslation();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const { register, handleSubmit, control, getValues, setValue, formState: { errors } } = useForm<CategoryFormValues>({
    defaultValues: {
      name: editTarget?.name ?? '',
      description: editTarget?.description ?? '',
      icon: editTarget?.icon ?? '',
      color: editTarget?.color ?? '',
    },
  });

  const nameAi = useAiFieldController<CategoryFormValues>({
    name: 'name',
    getValues,
    setValue,
    allowVoice: true,
  });

  const descriptionAi = useAiFieldController<CategoryFormValues>({
    name: 'description',
    getValues,
    setValue,
    allowVoice: true,
  });

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
    } catch {
      // Save failure is shipped by the global mutation logger; the mutation surfaces it in the UI.
    }
  };

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  const applyPatch = (patch: Record<string, unknown>) => {
    if (typeof patch.name === 'string') setValue('name', patch.name, { shouldDirty: true });
    if (typeof patch.description === 'string') setValue('description', patch.description, { shouldDirty: true });
    if (typeof patch.icon === 'string') setValue('icon', patch.icon, { shouldDirty: true });
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
        label={t('common.name')}
        placeholder={t('categories.namePlaceholder')}
        error={errors.name?.message}
        {...register('name', { required: t('common.nameRequired') })}
        ai={nameAi}
      />
      <Textarea
        label={t('common.description')}
        placeholder={t('categories.descriptionPlaceholder')}
        {...register('description')}
        ai={descriptionAi}
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
      entityType="category"
      getCurrentValues={() => getValues() as unknown as Record<string, unknown>}
      onPatch={applyPatch}
    />
    </>
  );
}
