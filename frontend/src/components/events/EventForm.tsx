import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { Icon } from '@/components/ui/Icon';
import type { CreateEventDto, PatchEventDto, FinanceEvent, EventType } from '@/models';
import { toLocalDateTimeString, getLocalizedNow } from '@/lib/format';
import { useDebounceCallback } from '@/hooks/useDebounce';

// Sub-components
import { BasicInfoFields } from '@/components/events/BasicInfoFields';
import { TypeAndDateFields } from '@/components/events/TypeAndDateFields';
import { LineItemsEditor } from '@/components/events/LineItemsEditor';

// Mapper and Schema
import { buildSchema, toCreateDto, toPatchDto, toDraftDto } from '@/components/events/EventFormMapper';
import type { FormValues } from '@/components/events/EventFormMapper';

// ─── Component ───────────────────────────────────────────────────────────────

interface EventFormProps {
  mode: 'create' | 'edit';
  baseValues?: Partial<FinanceEvent>;
  onSubmit: (dto: CreateEventDto | PatchEventDto, draftId?: number) => Promise<void>;
  onSaveDraft?: (dto: Partial<FinanceEvent>) => Promise<number | void>;
  onDeleteDraft?: (draftId?: number) => Promise<void>;
  isDraft?: boolean;
  submitLabel?: string;
  loading?: boolean;
}

const DEFAULT_LINE_ITEMS: FormValues['lineItems'] = [
  { nodeId: '', amount: '' },
  { nodeId: '', amount: '' },
];

/**
 * Builds the initial form values from saved event data (draft, template-as-event, or existing event).
 * Falls back to sensible defaults when no data is provided.
 */
function buildFormDefaults(defaultValues?: Partial<FinanceEvent>): FormValues {
  const transactionDate = defaultValues?.transactionDate
    ? toLocalDateTimeString(defaultValues.transactionDate)
    : toLocalDateTimeString(getLocalizedNow());

  const categoryId = defaultValues?.category ? String(defaultValues.category.id) : '';

  const tagIds = defaultValues?.tags?.map((t) => String(t.id)) ?? [];

  // lineItems from a template-as-event have amount === 0; keep the node pre-selected
  // but leave the amount empty so the user must fill it in.
  const lineItems =
    defaultValues?.lineItems?.map((li) => ({
      nodeId: String(li.financeNodeId),
      amount: li.amount !== 0 ? String(li.amount) : '',
    })) ?? DEFAULT_LINE_ITEMS;

  // Simplified mode: pre-selected nodes (from template) OR a brand-new empty form.
  // Full mode: an existing event with signed amounts in its line items.
  const hasPreSelectedNodes =
    !!defaultValues?.lineItems?.length &&
    defaultValues.lineItems.every((li) => li.amount === 0);
  const isSimplifiedMode = hasPreSelectedNodes || !defaultValues;

  return {
    name: defaultValues?.name ?? '',
    description: defaultValues?.description ?? '',
    receiptUrl: defaultValues?.receiptUrl ?? '',
    type: (defaultValues?.type as EventType) ?? 'OUTBOUND',
    transactionDate,
    categoryId,
    tagIds,
    lineItems,
    isDraft: defaultValues?.isDraft ?? false,
    draftId: defaultValues?.draftId,
    isSimplifiedMode,
  };
}

export function EventForm({
  mode,
  baseValues,
  onSubmit,
  onSaveDraft,
  onDeleteDraft,
  isDraft,
  submitLabel,
  loading = false,
}: EventFormProps) {
  const { t } = useTranslation();

  const schema = useMemo(() => buildSchema(t), [t]);
  const { data: categoriesResponse } = useCategories(0, 200);
  const { data: tagsResponse } = useTags(0, 200);
  const { data: nodesResponse } = useNodes(0, 200);

  const categories = categoriesResponse?.content ?? [];
  const tags = tagsResponse?.content ?? [];
  const nodes = nodesResponse?.content ?? [];

  const activeNodes = nodes.filter((n) => !n.archived);

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: useMemo(() => buildFormDefaults(baseValues), [baseValues]),
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { isDirty, dirtyFields },
  } = methods;

  // Keep a ref to the latest isDirty value so the watch callback (a stable closure)
  // can read the current value without becoming stale.
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const handleFormSubmit = async (values: FormValues) => {
    if (mode === 'edit') {
      const patch = toPatchDto(values, dirtyFields);
      await onSubmit(patch, values.draftId ?? undefined);
    } else {
      const dto = toCreateDto(values);
      await onSubmit(dto, values.draftId ?? undefined);
    }
  };

  const [savingDraft, setSavingDraft] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState(false);

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    setSavingDraft(true);
    try {
      const values = getValues();
      const draftDto = toDraftDto(values, t);

      const resultId = await onSaveDraft(draftDto);
      if (typeof resultId === 'number') {
        setValue('draftId', resultId);
        setValue('isDraft', true);
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const debouncedSaveDraft = useDebounceCallback(handleSaveDraft, 100);
  useEffect(() => {
    if (!onSaveDraft) return;

    const subscription = watch((_, { name }) => {
      if (name === 'draftId' || name === 'isDraft') return;
      // Only save draft when the user has actually changed something.
      // React Hook Form fires watch subscribers during its internal `values` sync on mount,
      // which would otherwise trigger an unwanted draft save immediately.
      if (!isDirtyRef.current) return;
      debouncedSaveDraft();
    });

    return () => subscription.unsubscribe();
  }, [watch, isDirty, onSaveDraft, debouncedSaveDraft]);

  const handleDeleteDraft = async () => {
    if (!onDeleteDraft) return;
    setDeletingDraft(true);
    try {
      const values = getValues();
      await onDeleteDraft(values.draftId ?? undefined);
    } finally {
      setDeletingDraft(false);
    }
  };

  const nodeOptions = activeNodes.map((n) => ({ value: String(n.id), label: n.name }));

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        <BasicInfoFields />

        <TypeAndDateFields />

        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <CategorySelector
              categories={categories}
              value={field.value ?? ''}
              onChange={field.onChange}
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
            />
          )}
        />

        <LineItemsEditor nodeOptions={nodeOptions} />

        <Input
          label={t('eventForm.receiptUrl')}
          placeholder={t('eventForm.receiptUrlPlaceholder')}
          type="url"
          {...register('receiptUrl')}
        />

        <div className="flex flex-col gap-3">
          {onSaveDraft && (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSaveDraft}
                loading={savingDraft}
                className="flex-1"
              >
                <Icon name="save" className="mr-2" />
                {t('drafts.save')}
              </Button>
              {isDraft && onDeleteDraft && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteDraft}
                  loading={deletingDraft}
                  className="flex-1 text-dn-error hover:bg-dn-error/10"
                >
                  <Icon name="delete" className="mr-2" />
                  {t('drafts.delete')}
                </Button>
              )}
            </div>
          )}
          <Button
            type="submit"
            size="sm"
            loading={loading}
            disabled={!isDirty && mode === 'edit' && !isDraft}
            className="w-full"
          >
            {submitLabel ?? t('common.save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
