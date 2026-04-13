import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IconPicker } from '@/components/ui/IconPicker';
import { TagSelector } from '@/components/ui/TagSelector';
import { useCreateTagGroup, useUpdateTagGroup } from '@/hooks/useTagGroups';
import { useTags } from '@/hooks/useTags';
import { nameField, descriptionField } from '@/lib/validation';
import type { TagGroup, CreateTagGroupDto } from '@/models';

interface TagGroupFormProps {
  initialData?: TagGroup;
  onSuccess?: (tagGroup: TagGroup) => void;
  onCancel?: () => void;
}

function buildSchema(t: (key: string) => string) {
  return z.object({
    name: nameField(t),
    description: descriptionField(t),
    icon: z.string().optional().or(z.literal('')),
    tagIds: z.array(z.number()).min(2, t('tagGroups.minTags')),
  });
}

type TagGroupFormValues = z.infer<ReturnType<typeof buildSchema>>;

export function TagGroupForm({ initialData, onSuccess, onCancel }: TagGroupFormProps) {
  const { t } = useTranslation();
  const createTagGroup = useCreateTagGroup();
  const updateTagGroup = useUpdateTagGroup();
  const { data: tagsPaged } = useTags(0, 100);

  const schema = useMemo(() => buildSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TagGroupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      icon: initialData?.icon ?? '',
      tagIds: initialData?.tags?.map((tag) => tag.id) ?? [],
    },
  });

  const onSubmit = async (data: TagGroupFormValues) => {
    const dto: CreateTagGroupDto = {
      name: data.name,
      description: data.description,
      icon: data.icon,
      tagIds: data.tagIds,
    };
    try {
      let saved: TagGroup;
      if (initialData) {
        saved = await updateTagGroup.mutateAsync({ id: initialData.id, dto });
      } else {
        saved = await createTagGroup.mutateAsync(dto);
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
        {...register('name')}
        error={errors.name?.message}
        placeholder={t('tags.namePlaceholder')}
        autoFocus
      />

      <Input
        label={t('common.description')}
        {...register('description')}
        error={errors.description?.message}
        placeholder={t('tags.descriptionPlaceholder')}
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
            error={errors.tagIds?.message}
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
