import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { TagGroupSelector } from '@/components/ui/TagGroupSelector';
import { AiFormActionsFab } from '@/components/ui/AiFormActionsFab';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useTagGroups } from '@/hooks/useTagGroups';
import { useNodes } from '@/hooks/useNodes';
import { useAiFormController } from '@/hooks/useAiFormController';
import type { CreateEventDto, PatchEventDto, FinanceEvent } from '@/models';
import { buildSchema, buildFormDefaults, MIN_LINE_ITEMS, toDraftDto } from '@/components/events/EventFormMapper';
import { prependMissingArchived } from '@/lib/prependMissingArchived';



// Sub-components
import { BasicInfoFields } from '@/components/events/BasicInfoFields';
import { TypeAndDateFields } from '@/components/events/TypeAndDateFields';
import { LineItemsEditor } from '@/components/events/LineItemsEditor';

// Mapper
import { toCreateDto, toPatchDtoFromDiff } from '@/components/events/EventFormMapper';
import type { FormValues } from '@/components/events/EventFormMapper';
import { FullPageSpinner } from '@/components/ui/Spinner';

// ─── Component ───────────────────────────────────────────────────────────────

interface EventFormProps {
  mode: 'create' | 'edit';

  /**
   * The persisted event as it exists on the server — used as the baseline for the PATCH diff
   * in edit mode. The form never displays these values directly when a draft is present.
   */
  baseValues?: Partial<FinanceEvent>;

  /**
   * In-progress edits saved as a draft. When provided, the form displays these values.
   */
  draftValues?: Partial<FinanceEvent>;

  /**
   * Called on valid submission with a fully-resolved DTO (CreateEventDto in create mode,
   * PatchEventDto with only dirty fields in edit mode). Receives `draftId` so the parent can
   * delete the associated draft atomically in the same operation.
   */
  onSubmit: (dto: CreateEventDto | PatchEventDto, draftId?: number) => Promise<void>;

  /**
   * Fires on every form field change with the current values. Parents can read
   * `draftId` from the payload to drive UI like the DraftBadge.
   */
  onChange?: (dto: Partial<FinanceEvent>, values: FormValues) => void;

  submitLabel?: string;
  loading?: boolean;
}

export function EventForm({
  mode,
  baseValues,
  draftValues,
  onSubmit,
  onChange,
  submitLabel,
  loading = false,
}: EventFormProps) {
  const { t } = useTranslation();

  const schema = useMemo(() => buildSchema(t, MIN_LINE_ITEMS), [t]);
  const computedValues = useMemo(
    () => buildFormDefaults(draftValues ?? baseValues),
    [draftValues, baseValues],
  );
  const initValues = useMemo(() => buildFormDefaults(baseValues), [baseValues]);

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initValues,
    values: computedValues,
    resetOptions: { keepDefaultValues: true },
  });

  const [formReady, setFormReady] = useState(!draftValues);
  useEffect(() => {
    if (!formReady) setFormReady(true);
  }, [formReady]);

  const { data: categoriesResponse } = useCategories(0, 200);
  const { data: tagsResponse } = useTags(0, 200);
  const { data: tagGroupsResponse } = useTagGroups(0, 100);
  const { data: nodesResponse } = useNodes(0, 200);

  const baseCategory = draftValues?.category ?? baseValues?.category;
  const baseTags = useMemo(
    () => [...(baseValues?.tags ?? []), ...(draftValues?.tags ?? [])],
    [baseValues?.tags, draftValues?.tags],
  );

  const categories = useMemo(() => {
    const active = categoriesResponse?.content ?? [];
    return prependMissingArchived(active, baseCategory ? [baseCategory] : []);
  }, [categoriesResponse, baseCategory]);

  const tags = useMemo(() => {
    const active = tagsResponse?.content ?? [];
    return prependMissingArchived(active, baseTags);
  }, [tagsResponse, baseTags]);

  const tagGroups = tagGroupsResponse?.content ?? [];
  const nodes = nodesResponse?.content ?? [];

  const {
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { isDirty }
  } = methods;

  const alert = useAlert();

  const handleFormSubmit = async (values: FormValues) => {
    try {
      if (mode === 'edit') {
        const patch = toPatchDtoFromDiff(baseValues ?? {}, values);
        await onSubmit(patch, values.draftId ?? undefined);
      } else {
        const dto = toCreateDto(values);
        await onSubmit(dto, values.draftId ?? undefined);
      }
    } catch (err) {
      alert.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleInvalidSubmit = (fieldErrors: Record<string, unknown>) => {
    const findFirstMessage = (value: unknown): string | undefined => {
      if (!value || typeof value !== 'object') return undefined;
      if ('message' in value && typeof (value as { message: unknown }).message === 'string') {
        return (value as { message: string }).message;
      }
      for (const child of Object.values(value as object)) {
        const found = findFirstMessage(child);
        if (found) return found;
      }
      return undefined;
    };
    const errorMessage = findFirstMessage(fieldErrors) ?? t('common.validationError');
    alert.error(errorMessage);
  };

  const hasUserInteracted = useRef(false);

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (name === 'draftId') return;

      if (!hasUserInteracted.current) {
        hasUserInteracted.current = true;
        return;
      }

      if (onChange) {
        onChange(toDraftDto(values as FormValues, t), values as FormValues);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, onChange, t]);

  const buildAiContext = () => {
    const values = getValues();
    const parts: string[] = [];

    if (values.name) parts.push(`Name: ${values.name}`);
    if (values.description) parts.push(`Description: ${values.description}`);
    if (values.type) parts.push(`Type: ${values.type}`);
    if (values.transactionDate) parts.push(`Date: ${values.transactionDate}`);

    if (values.categoryId) {
      const category = categories.find((c) => String(c.id) === values.categoryId);
      if (category) {
        let catLine = `Category: ${category.name}`;
        if (category.description) catLine += ` (${category.description})`;
        parts.push(catLine);
      }
    }

    if (values.tagIds?.length) {
      const selectedTags = tags.filter((tag) => values.tagIds!.includes(String(tag.id)));
      if (selectedTags.length > 0) {
        const tagLines = selectedTags.map((tag) => {
          let line = `- ${tag.name}`;
          if (tag.description) line += ` (${tag.description})`;
          return line;
        });
        parts.push(`Tags:\n${tagLines.join('\n')}`);
      }
    }

    const filledLineItems = values.lineItems.filter((li) => li.nodeId);
    if (filledLineItems.length > 0) {
      const nodeLines = filledLineItems.map((li) => {
        const node = nodes.find((n) => String(n.id) === li.nodeId);
        const nodeName = node ? node.name : `Node ${li.nodeId}`;
        return `- ${nodeName}: ${li.amount}`;
      });
      parts.push(`Nodes:\n${nodeLines.join('\n')}`);
    }

    return parts.join('\n');
  };

  const aiFields = useMemo(() => [
    {
      key: 'name',
      name: 'name' as const,
      label: t('eventForm.eventName'),
      semantic: 'name' as const,
      allowVoice: true,
    },
    {
      key: 'description',
      name: 'description' as const,
      label: t('eventForm.description'),
      semantic: 'description' as const,
      allowVoice: true,
    },
  ], [t]);

  const aiController = useAiFormController<FormValues>({
    fields: aiFields,
    getValues,
    setValue,
    buildContext: buildAiContext,
    shouldDirty: true,
  });

  if (!formReady) return <FullPageSpinner />

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)} className="space-y-5">
        <BasicInfoFields
          onNameFocus={() => aiController.markFieldAsActive('name')}
          onDescriptionFocus={() => aiController.markFieldAsActive('description')}
        />

        <TypeAndDateFields />

        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <CategorySelector
              categories={categories}
              value={field.value ?? ''}
              onChange={field.onChange}
              showAdd={true}
              collapsible={true}
            />
          )}
        />

        <Controller
          name="tagIds"
          control={control}
          render={({ field }) => (
            <div className="space-y-3">
              <TagGroupSelector
                tagGroups={tagGroups}
                selectedTagIds={field.value ?? []}
                onChange={field.onChange}
              />
              <TagSelector
                tags={tags}
                value={field.value ?? []}
                onChange={field.onChange}
                showAdd={true}
                collapsible={true}
              />
            </div>
          )}
        />

        <LineItemsEditor nodes={nodes} minItems={2} />

        <Button
          type="submit"
          size="sm"
          loading={loading}
          disabled={!isDirty}
          className="w-full"
        >
          {submitLabel ?? t('common.save')}
        </Button>

      </form>
      <AiFormActionsFab controller={aiController} />
    </FormProvider>
  );
}
