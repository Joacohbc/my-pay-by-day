import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
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
import { FullPageSpinner } from '@/components/ui/Spinner';

// ─── Component ───────────────────────────────────────────────────────────────

interface EventFormProps {
  mode: 'create' | 'edit';
  /**
   * The persisted event as it exists on the server — used exclusively as the RHF dirty-tracking
   * baseline. The form never displays these values directly when a draft is present.
   */
  baseValues?: Partial<FinanceEvent>;
  /**
   * In-progress edits saved as a draft. When provided, the form displays these values while
   * `baseValues` stays frozen as the baseline, so `dirtyFields` reflects the real diff between
   * the draft and the original event.
   */
  draftValues?: Partial<FinanceEvent>;
  /**
   * Called on valid submission with a fully-resolved DTO (CreateEventDto in create mode,
   * PatchEventDto with only dirty fields in edit mode). Receives `draftId` so the parent can
   * delete the associated draft atomically in the same operation.
   */
  onSubmit: (dto: CreateEventDto | PatchEventDto, draftId?: number) => Promise<void>;
  /**
   * When provided, enables draft persistence: renders the "Save draft" button and activates the
   * debounced autosave on every field change. Returns the server-assigned draft ID on creation
   * so the form can store it internally and reuse it on subsequent saves.
   */
  onSaveDraft?: (dto: Partial<FinanceEvent>) => Promise<number | void>;
  onDeleteDraft?: (draftId?: number) => Promise<void>;
  /**
   * Controls only the visibility of the "Delete draft" button — it does not affect form
   * behaviour. Must be true when the form is loaded from an existing persisted draft.
   */
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
  draftValues,
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

  // `defaultValues` acts as the immutable dirty-tracking baseline (the original saved event).
  // `values` drives what is actually displayed — the draft when one exists, otherwise the event.
  // `resetOptions.keepDefaultValues` prevents RHF from overwriting that baseline when `values`
  // updates, so `dirtyFields` always reflects the real diff between the draft and the original.
  const computedValues = useMemo(() => buildFormDefaults(draftValues ?? baseValues), [draftValues, baseValues]);
  const initValues = useMemo(() => buildFormDefaults(baseValues), [baseValues]);
  
  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initValues,
    values: computedValues,
    resetOptions: { keepDefaultValues: true },
  });

  // When a draft is present, RHF needs one render cycle to apply `values` over `defaultValues`.
  // Hide the form body until the values have settled to prevent a visible flash in category/tags.
  const [formReady, setFormReady] = useState(!draftValues);
  useEffect(() => {
    if (!formReady) setFormReady(true);
  }, [formReady]);

  
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { isDirty, dirtyFields },
  } = methods;
  
  const alert = useAlert();
  
  const handleFormSubmit = async (values: FormValues) => {
    try {
      if (mode === 'edit') {
        const patch = toPatchDto(values, dirtyFields);
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
  
  const [deletingDraft, setDeletingDraft] = useState(false);
  
  const saveDraftCore = async () => {
    if (!onSaveDraft) return;
    const values = getValues();
    const draftDto = toDraftDto(values, t);
    const resultId = await onSaveDraft(draftDto);
    if (typeof resultId === 'number') {
      setValue('draftId', resultId);
      setValue('isDraft', true);
    }
  };

  const hasUserInteracted = useRef(false);

  // The user may close the browser or navigate away mid-form. Every change is automatically
  // persisted as a draft so they can resume exactly where they left off.
  // Uses saveDraftCore (no loading state) to avoid flashing buttons on auto-save.
  const debouncedSaveDraft = useDebounceCallback(saveDraftCore, 1000);
  useEffect(() => {
    if (!onSaveDraft) return;

    const subscription = watch((_, { name }) => {
      if (name === 'draftId' || name === 'isDraft') return;
      if (!hasUserInteracted.current) {
        hasUserInteracted.current = true;
        return;
      }
      debouncedSaveDraft();
    });

    return () => subscription.unsubscribe();
  }, [watch, onSaveDraft, debouncedSaveDraft]);

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

  if (!formReady) return <FullPageSpinner />

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)} className="space-y-5">
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
          {isDraft && onDeleteDraft && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeleteDraft}
              loading={deletingDraft}
              className="w-full text-dn-error hover:bg-dn-error/10"
            >
              <Icon name="delete" className="mr-2" />
              {t('drafts.delete')}
            </Button>
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
