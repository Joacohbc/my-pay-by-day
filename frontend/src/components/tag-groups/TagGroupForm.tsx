import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IconPicker } from '@/components/ui/IconPicker';
import { TagSelector } from '@/components/ui/TagSelector';
import { useCreateTagGroup, useUpdateTagGroup } from '@/hooks/useTagGroups';
import { useTags } from '@/hooks/useTags';
import type { TagGroup, CreateTagGroupDto } from '@/models';

interface TagGroupFormProps {
  initialData?: TagGroup;
  onSuccess?: (tagGroup: TagGroup) => void;
  onCancel?: () => void;
}

export function TagGroupForm({ initialData, onSuccess, onCancel }: TagGroupFormProps) {
  const { t } = useTranslation();
  const createTagGroup = useCreateTagGroup();
  const updateTagGroup = useUpdateTagGroup();
  const { data: tagsPaged } = useTags(0, 100);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTagGroupDto>({
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      icon: initialData?.icon ?? '',
      tagIds: initialData?.tags?.map(t => t.id) ?? [],
    },
  });

  const onSubmit = async (data: CreateTagGroupDto) => {
    try {
      let saved: TagGroup;
      if (initialData) {
        saved = await updateTagGroup.mutateAsync({ id: initialData.id, dto: data });
      } else {
        saved = await createTagGroup.mutateAsync(data);
      }
      onSuccess?.(saved);
    } catch {
      // Error handled by mutation
    }
  };

  const allTags = tagsPaged?.content ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label={t('common.name')}
        {...register('name', { required: t('validation.required') })}
        error={errors.name?.message}
        placeholder={t('common.name')}
        autoFocus
      />

      <Input
        label={t('common.description')}
        {...register('description')}
        error={errors.description?.message}
        placeholder={t('common.description')}
      />

      <Controller
        name="icon"
        control={control}
        render={({ field }) => (
          <IconPicker
            label={t('tagGroups.iconLabel')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <Controller
        name="tagIds"
        control={control}
        render={({ field }) => (
          <TagSelector
            tags={allTags}
            value={field.value.map(String)}
            onChange={(ids) => field.onChange(ids.map(Number))}
            label={t('eventForm.tags')}
            showAdd={true}
          />
        )}
      />

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
