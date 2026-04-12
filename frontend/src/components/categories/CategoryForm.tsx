import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { IconPicker } from '@/components/ui/IconPicker';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
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
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const { register, handleSubmit, control, formState: { errors } } = useForm<CategoryFormValues>({
    defaultValues: {
      name: editTarget?.name ?? '',
      description: editTarget?.description ?? '',
      icon: editTarget?.icon ?? '',
    },
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
        placeholder={t('categories.namePlaceholder')}
        error={errors.name?.message}
        {...register('name', { required: t('common.nameRequired') })}
      />
      <Textarea
        label={t('common.description')}
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
