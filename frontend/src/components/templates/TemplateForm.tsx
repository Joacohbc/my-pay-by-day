import { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { LineItemsEditor } from '@/components/events/LineItemsEditor';
import { useAiFieldController } from '@/hooks/useAiFieldController';
import { prependMissingArchived } from '@/lib/prependMissingArchived';
import {
  buildSchema,
  fromTemplate,
  toCreateDto,
  DEFAULT_VALUES,
  type FormValues,
} from '@/components/templates/TemplateFormMapper';
import type { Template, CreateTemplateDto } from '@/models';

interface TemplateFormProps {
  editTarget?: Template | null;
  onSubmit: (dto: CreateTemplateDto) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

const MIN_LINE_ITEMS = 0;
const MAX_LINE_ITEMS = 2;

export function TemplateForm({ editTarget, onSubmit, onCancel, loading }: TemplateFormProps) {
  const { t } = useTranslation();
  const schema = buildSchema(t, MIN_LINE_ITEMS, MAX_LINE_ITEMS);

  const { data: categoriesResponse } = useCategories();
  const { data: tagsResponse } = useTags();
  const { data: nodesResponse } = useNodes(true);

  const baseCategory = editTarget?.category;
  const baseTags = useMemo(() => editTarget?.tags ?? [], [editTarget?.tags]);

  const categories = useMemo(() => {
    const active = categoriesResponse ?? [];
    return prependMissingArchived(active, baseCategory ? [baseCategory] : []);
  }, [categoriesResponse, baseCategory]);

  const tags = useMemo(() => {
    const active = tagsResponse ?? [];
    return prependMissingArchived(active, baseTags);
  }, [tagsResponse, baseTags]);

  const nodes = nodesResponse ?? [];

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editTarget ? fromTemplate(editTarget) : DEFAULT_VALUES,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = methods;

  // Re-populate when editTarget changes (e.g. modal opens for different item)
  useEffect(() => {
    reset(editTarget ? fromTemplate(editTarget) : DEFAULT_VALUES);
  }, [editTarget, reset]);

  const watchModifierType = useWatch({ control, name: 'modifierType' });

  const buildContext = () => {
    const values = getValues();
    const parts: string[] = ['Entity type: Template (blueprint for creating finance events quickly)'];
    if (values.name) parts.push(`Name: ${values.name}`);
    if (values.description) parts.push(`Description: ${values.description}`);
    if (values.eventType) parts.push(`Event type: ${values.eventType}`);
    return parts.join('\n');
  };

  const nameAi = useAiFieldController<FormValues>({
    name: 'name',
    semantic: 'name',
    getValues,
    setValue,
    buildContext,
    allowVoice: true,
  });

  const descriptionAi = useAiFieldController<FormValues>({
    name: 'description',
    semantic: 'description',
    getValues,
    setValue,
    buildContext,
    allowVoice: true,
  });

  const handleFormSubmit = async (values: FormValues) => {
    await onSubmit(toCreateDto(values));
  };

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit(handleFormSubmit)(e);
        }}
      >
        <Input
          label={t('common.name')}
          placeholder={t('templates.namePlaceholder')}
          error={errors.name?.message}
          {...register('name')}
          ai={nameAi}
        />

        <Textarea
          label={t('common.description')}
          placeholder={t('templates.descriptionPlaceholder')}
          error={errors.description?.message}
          {...register('description')}
          ai={descriptionAi}
        />

        <Controller
          name="eventType"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t('templates.eventType')}
              placeholder={t('common.none')}
              options={[
                { value: 'INBOUND', label: t('eventType.INBOUND') },
                { value: 'OUTBOUND', label: t('eventType.OUTBOUND') },
                { value: 'OTHER', label: t('eventType.OTHER') },
              ]}
              value={field.value}
              onBlur={field.onBlur}
              name={field.name}
              onChange={(val) => field.onChange(val ?? '')}
              allowNone
            />
          )}
        />

        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <CategorySelector
              categories={categories}
              value={field.value ?? ''}
              onChange={(val) => field.onChange(val)}
              showAdd={true}
              collapsible={true}
            />
          )}
        />

        <Controller
          name="tagIds"
          control={control}
          render={({ field }) => (
            <TagSelector
              tags={tags}
              value={field.value ?? []}
              onChange={field.onChange}
              showAdd={true}
            />
          )}
        />

        <LineItemsEditor nodes={nodes} minItems={MIN_LINE_ITEMS} maxItems={MAX_LINE_ITEMS} />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="modifierType"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label={t('templates.modifierType')}
                placeholder={t('common.none')}
                options={[
                  { value: '', label: t('common.none') },
                  { value: 'PERCENTAGE', label: t('templates.percentage') },
                  { value: 'FIXED', label: t('templates.fixed') },
                ]}
                {...field}
                onChange={(val) => {
                  field.onChange(val);
                  if (!val) {
                    setValue('modifierValue', '');
                  }
                }}
              />
            )}
          />
          {watchModifierType && (
            <Input
              label={t('templates.modifierValue')}
              placeholder={watchModifierType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 5.00'}
              type="number"
              step="0.01"
              min="0"
              error={errors.modifierValue?.message}
              {...register('modifierValue')}
            />
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" fullWidth loading={loading}>
            {editTarget ? t('common.update') : t('common.create')}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
        </div>

      </form>
    </FormProvider>
  );
}
