import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import { Controller, FormProvider } from 'react-hook-form';
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
import { useEventForm } from '@/hooks/useEventForm';
import { Icon } from '@/components/ui/Icon';
import type { CreateEventDto, PatchEventDto, FinanceEvent } from '@/models';
import { useDebounceCallback } from '@/hooks/useDebounce';



// Sub-components
import { BasicInfoFields } from '@/components/events/BasicInfoFields';
import { TypeAndDateFields } from '@/components/events/TypeAndDateFields';
import { LineItemsEditor } from '@/components/events/LineItemsEditor';

// Mapper
import { toCreateDto, toPatchDto, toDraftDto } from '@/components/events/EventFormMapper';
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
  onDeleteDraft?: (draftId?: number, shouldExit?: boolean) => Promise<void>;
  /**
   * Controls only the visibility of the "Delete draft" button — it does not affect form
   * behaviour. Must be true when the form is loaded from an existing persisted draft.
   */
  isDraft?: boolean;
  submitLabel?: string;
  loading?: boolean;
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

  const { methods, formReady } = useEventForm({ baseValues, draftValues });

  const { data: categoriesResponse } = useCategories(0, 200);
  const { data: tagsResponse } = useTags(0, 200);
  const { data: tagGroupsResponse } = useTagGroups(0, 100);
  const { data: nodesResponse } = useNodes(0, 200);

  const categories = categoriesResponse?.content ?? [];
  const tags = tagsResponse?.content ?? [];
  const tagGroups = tagGroupsResponse?.content ?? [];
  const nodes = nodesResponse?.content ?? [];

  
  const {
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

  const handleDeleteDraft = async (shouldExit = true) => {
    if (!onDeleteDraft) return;
    setDeletingDraft(true);
    try {
      const values = getValues();
      await onDeleteDraft(values.draftId ?? undefined, shouldExit);
    } finally {
      setDeletingDraft(false);
    }
  };

  const buildAiContext = () => {
    const values = getValues();
    const parts: string[] = [];
    if (values.name) parts.push(`Name: ${values.name}`);
    if (values.description) parts.push(`Description: ${values.description}`);
    if (values.type) parts.push(`Type: ${values.type}`);
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

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            size="sm"
            loading={loading}
            disabled={!isDirty && mode === 'edit' && !isDraft}
            className="w-full"
          >
            {submitLabel ?? t('common.save')}
          </Button>

          {isDraft && onDeleteDraft && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteDraft(true)}
                loading={deletingDraft}
                className="flex-1 text-dn-error hover:bg-dn-error/10"
              >
                <Icon name="logout" className="mr-2" />
                {t('drafts.deleteAndExit')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteDraft(false)}
                loading={deletingDraft}
                className="flex-1 text-dn-error/80 hover:bg-dn-error/10"
              >
                <Icon name="refresh" className="mr-2" />
                {t('drafts.deleteAndReset')}
              </Button>
            </div>
          )}
        </div>

      </form>
      <AiFormActionsFab controller={aiController} />
    </FormProvider>
  );
}
