import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFieldArray, useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import type { CreateEventDto, EventType, FinanceEvent, Category, Tag, FinanceLineItem } from '@/models';
import type { Control, UseFormRegister, FieldErrors, UseFormSetValue, UseFieldArrayAppend, UseFieldArrayRemove, FieldArrayWithId } from 'react-hook-form';
import { toLocalDateTimeString, getLocalizedNow } from '@/lib/format';
import { useDebounceCallback } from '@/hooks/useDebounce';

// ─── Schema ──────────────────────────────────────────────────────────────────

function buildSchema(t: (key: string) => string) {
  const lineItemSchema = z.object({
    nodeId: z.string().min(1, t('eventForm.nodeRequired')),
    amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) !== 0, {
      message: t('eventForm.amountNonZero'),
    }),
  });

  return z.object({
    name: z.string().min(1, t('eventForm.nameRequired')),
    description: z.string().optional(),
    receiptUrl: z.string().optional(),
    type: z.enum(['INBOUND', 'OUTBOUND', 'OTHER']),
    transactionDate: z.string().min(1, t('eventForm.dateRequired')),
    categoryId: z.string().optional(),
    tagIds: z.array(z.string()).optional(),
    lineItems: z.array(lineItemSchema).min(1, t('eventForm.atLeastOneLine')),
    isDraft: z.boolean().optional(),
    draftId: z.number().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Sub-components ─────────────────────────────────────────────────────────

interface CategorySelectorProps {
  categories: Category[];
  control: Control<FormValues>;
}

function CategorySelector({ categories, control }: CategorySelectorProps) {
  const { t } = useTranslation();

  if (categories.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">
        {t('eventForm.category')}
      </p>
      <Controller
        name="categoryId"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-4 gap-x-3 gap-y-4">
            {categories.map((cat) => {
              const selected = field.value === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => field.onChange(selected ? '' : String(cat.id))}
                  className="flex flex-col items-center gap-2"
                >
                  <CategoryIcon
                    category={cat}
                    size="lg"
                    colorClass={selected ? 'bg-dn-primary text-dn-bg' : 'bg-dn-surface text-dn-text-muted'}
                    className="transition-all active:scale-95"
                  />
                  <span
                    className={[
                      'text-xs text-center font-medium leading-tight',
                      selected ? 'text-dn-primary' : 'text-dn-text-muted',
                    ].join(' ')}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      />
    </div>
  );
}

interface TagSelectorProps {
  tags: Tag[];
  control: Control<FormValues>;
}

function TagSelector({ tags, control }: TagSelectorProps) {
  const { t } = useTranslation();

  if (tags.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">{t('eventForm.tags')}</p>
      <div className="flex flex-wrap gap-2">
        <Controller
          name="tagIds"
          control={control}
          render={({ field }) => (
            <>
              {tags.map((tag) => {
                const selected = field.value?.includes(String(tag.id));
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      const current = field.value ?? [];
                      if (selected) {
                        field.onChange(current.filter((id) => id !== String(tag.id)));
                      } else {
                        field.onChange([...current, String(tag.id)]);
                      }
                    }}
                    className={[
                      'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer',
                      selected
                        ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                        : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
                    ].join(' ')}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </>
          )}
        />
      </div>
    </div>
  );
}

interface BasicInfoFieldsProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}

function BasicInfoFields({ register, errors }: BasicInfoFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Input
        label={t('eventForm.eventName')}
        placeholder={t('eventForm.eventNamePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea
        label={t('eventForm.description')}
        placeholder={t('eventForm.descriptionPlaceholder')}
        {...register('description')}
      />
    </>
  );
}

interface TypeAndDateFieldsProps {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}

function TypeAndDateFields({ control, register, errors }: TypeAndDateFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <Controller
        name="type"
        control={control}
        render={({ field }) => {
          const typeStyles = {
            OUTBOUND: {
              active: 'bg-dn-error/15 text-dn-error',
              inactive: 'text-dn-text-muted hover:text-dn-error',
            },
            INBOUND: {
              active: 'bg-dn-success/15 text-dn-success',
              inactive: 'text-dn-text-muted hover:text-dn-success',
            },
            OTHER: {
              active: 'bg-dn-info/15 text-dn-info',
              inactive: 'text-dn-text-muted hover:text-dn-info',
            },
          } as const;

          return (
            <div>
              <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">
                {t('eventForm.type')}
              </p>
              <div className="flex rounded-pill bg-dn-surface-low p-1 gap-1">
                {(['OUTBOUND', 'INBOUND', 'OTHER'] as const).map((opt) => {
                  const styles = typeStyles[opt];
                  const isActive = field.value === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => field.onChange(opt)}
                      className={[
                        'flex-1 py-2 rounded-pill text-sm font-semibold transition-all',
                        isActive ? styles.active : styles.inactive,
                      ].join(' ')}
                    >
                      {t(`eventType.${opt}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }}
      />

      <Input
        type="datetime-local"
        label={t('eventForm.dateTime')}
        error={errors.transactionDate?.message}
        {...register('transactionDate')}
      />
    </div>
  );
}

interface LineItemsEditorProps {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  fields: FieldArrayWithId<FormValues, 'lineItems', 'id'>[];
  append: UseFieldArrayAppend<FormValues, 'lineItems'>;
  remove: UseFieldArrayRemove;
  isSimplifiedMode: boolean;
  setIsSimplifiedMode: (val: boolean) => void;
  setValue: UseFormSetValue<FormValues>;
  firstAmount?: string;
  nodeOptions: { value: string; label: string }[];
}

function LineItemsEditor({
  control,
  register,
  errors,
  fields,
  append,
  remove,
  isSimplifiedMode,
  setIsSimplifiedMode,
  setValue,
  firstAmount,
  nodeOptions,
}: LineItemsEditorProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">{t('eventForm.lineItems')}</p>
        <div className="flex items-center gap-3">
          {!isSimplifiedMode && (
            <button
              type="button"
              onClick={() => append({ nodeId: '', amount: '' })}
              className="flex items-center gap-1 text-xs text-dn-primary hover:brightness-110 transition-all"
            >
              <Icon name="add" className="text-sm" />
              {t('eventForm.addLineItem')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!isSimplifiedMode) {
                setIsSimplifiedMode(true);
              } else {
                const num = parseFloat(firstAmount ?? '') || 0;
                if (num !== 0) {
                  fields.forEach((_, i) => {
                    setValue(`lineItems.${i}.amount`, String(i === 0 ? -Math.abs(num) : Math.abs(num)));
                  });
                }
                setIsSimplifiedMode(false);
              }
            }}
            className="text-xs text-dn-text-muted hover:text-dn-primary transition-colors"
          >
            {isSimplifiedMode ? t('eventForm.manualMode') : t('eventForm.simplifiedMode')}
          </button>
        </div>
      </div>
      {errors.lineItems?.root?.message && (
        <p className="text-xs text-dn-error mb-2">{errors.lineItems.root.message}</p>
      )}

      {isSimplifiedMode ? (
        <div className="space-y-3">
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-3 px-3 py-2 rounded-input bg-dn-surface-low">
                <span className={`text-sm font-bold w-4 shrink-0 ${i === 0 ? 'text-dn-error' : 'text-dn-success'}`}>
                  {i === 0 ? '−' : '+'}
                </span>
                <div className="flex-1">
                  <Controller
                    name={`lineItems.${i}.nodeId`}
                    control={control}
                    render={({ field: f }) => (
                      <SearchableSelect
                        placeholder={t('eventForm.selectNode')}
                        options={nodeOptions}
                        error={errors.lineItems?.[i]?.nodeId?.message}
                        {...f}
                      />
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
          <Input
            label={t('eventForm.amount')}
            placeholder={t('eventForm.amountPlaceholder')}
            type="number"
            step="0.01"
            error={errors.lineItems?.[0]?.amount?.message}
            {...register('lineItems.0.amount')}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex gap-2 items-center">
              <div className="flex-1">
                <Controller
                  name={`lineItems.${i}.nodeId`}
                  control={control}
                  render={({ field: f }) => (
                    <SearchableSelect
                      placeholder={t('eventForm.selectNode')}
                      options={nodeOptions}
                      error={errors.lineItems?.[i]?.nodeId?.message}
                      {...f}
                    />
                  )}
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-24">
                  <Input
                    placeholder={t('eventForm.amountPlaceholder')}
                    type="number"
                    step="0.01"
                    error={errors.lineItems?.[i]?.amount?.message}
                    {...register(`lineItems.${i}.amount`)}
                  />
                </div>
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors"
                >
                  <Icon name="delete" className="text-base" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-dn-text-muted mt-2">
        {isSimplifiedMode ? t('eventForm.signedAmountHint') : t('eventForm.manualAmountHint')}
      </p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface EventFormPreset {
  type?: EventType;
  categoryId?: number;
  tagIds?: string[];
  lineNodeIds?: number[];
}

interface EventFormProps {
  defaultValues?: Partial<FinanceEvent>;
  preset?: EventFormPreset;
  onSubmit: (dto: CreateEventDto, draftId?: number) => Promise<void>;
  onSaveDraft?: (dto: Partial<FinanceEvent>) => Promise<number | void>;
  onDeleteDraft?: (draftId?: number) => Promise<void>;
  isDraft?: boolean;
  submitLabel?: string;
  loading?: boolean;
}

export function EventForm({
  defaultValues,
  preset,
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

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      receiptUrl: defaultValues?.receiptUrl ?? '',
      type: defaultValues?.type ?? preset?.type ?? 'OUTBOUND',
      // Convert current date to the user's localized time before putting it into the datetime-local input
      transactionDate: defaultValues?.transactionDate
        ? toLocalDateTimeString(defaultValues.transactionDate) // defaultValues are already properly formatted to local time by interceptor
        : toLocalDateTimeString(getLocalizedNow()),
      categoryId: defaultValues?.category
        ? String(defaultValues.category.id)
        : preset?.categoryId
          ? String(preset.categoryId)
          : '',
      tagIds: defaultValues?.tags?.map((t) => String(t.id)) ?? preset?.tagIds ?? [],
      lineItems:
        defaultValues?.lineItems?.map((li) => ({
          nodeId: String(li.financeNodeId),
          amount: String(li.amount),
        })) ??
        (preset?.lineNodeIds?.length
          ? preset.lineNodeIds.map((id) => ({ nodeId: String(id), amount: '' }))
          : [{ nodeId: '', amount: '' }, { nodeId: '', amount: '' }]),
      isDraft: defaultValues?.isDraft ?? false,
      draftId: defaultValues?.draftId,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const [isSimplifiedMode, setIsSimplifiedMode] = useState(
    !!(preset?.lineNodeIds?.length) || !defaultValues,
  );
  const firstAmount = useWatch({ control, name: 'lineItems.0.amount' });

  useEffect(() => {
    if (!isSimplifiedMode) return;
    for (let i = 1; i < fields.length; i++) {
      setValue(`lineItems.${i}.amount`, firstAmount ?? '');
    }
  }, [firstAmount, isSimplifiedMode, fields.length, setValue]);

  const handleFormSubmit = async (values: FormValues) => {
    const dto: CreateEventDto = {
      name: values.name,
      description: values.description || undefined,
      receiptUrl: values.receiptUrl || undefined,
      type: values.type,
      transaction: {
        // Form input datetime-local returns "YYYY-MM-DDTHH:mm". We append the seconds so it's parsed as expected locally before interceptors make it UTC.
        transactionDate: values.transactionDate.includes(':00.000') ? values.transactionDate : `${values.transactionDate}:00.000`,
        lineItems: values.lineItems.map((li, i) => {
          let amount = Number(li.amount);
          if (isSimplifiedMode) {
            // First item (amount == 0) is the one that determines the sign of the transaction.
            // because it is the one that is lose X (origin) money and the destination is the one that gain X money (destination)
            amount = i === 0 ? -Math.abs(amount) : Math.abs(amount);
          }
          return {
            financeNode: { id: Number(li.nodeId) },
            amount,
          };
        }),
      },
      category: values.categoryId ? { id: Number(values.categoryId) } : undefined,
      tags: values.tagIds?.map((id) => ({ id: Number(id) })),
    };
    await onSubmit(dto, values.draftId);
  };

  const [savingDraft, setSavingDraft] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState(false);

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    setSavingDraft(true);
    try {
      const values = getValues();
      const draftDto: Partial<FinanceEvent> = {
        name: values.name || t('drafts.untitledDraft'),
        description: values.description || undefined,
        receiptUrl: values.receiptUrl || undefined,
        type: values.type,
      };

      const transactionDate = values.transactionDate
        ? (values.transactionDate.includes(':00.000') ? values.transactionDate : `${values.transactionDate}:00.000`)
        : undefined;

      draftDto.transactionDate = transactionDate || `${toLocalDateTimeString(getLocalizedNow())}:00.000`;
      
      draftDto.lineItems = values.lineItems.map((li, i) => {
          const amountStr = li.amount;
          let amount = amountStr ? Number(amountStr) : 0;
          if (isSimplifiedMode) {
            amount = i === 0 ? -Math.abs(amount) : Math.abs(amount);
          }
          return {
            id: 0,
            financeNodeId: li.nodeId ? Number(li.nodeId) : 0,
            financeNodeName: '',
            amount,
          } as FinanceLineItem;
        }).filter(li => li.financeNodeId || li.amount !== 0);

      // Cast to Category and Tag since the backend only needs the ID to link them
      if (values.categoryId) draftDto.category = { id: Number(values.categoryId) } as Category;
      if (values.tagIds?.length) draftDto.tags = values.tagIds.map(id => ({ id: Number(id) } as Tag));

      draftDto.isDraft = true;
      draftDto.draftId = values.draftId;

      const resultId = await onSaveDraft(draftDto);
      if (typeof resultId === 'number') {
        setValue('draftId', resultId);
        setValue('isDraft', true);
      }
    } finally {
      setSavingDraft(false);
    }
  };

  // Debounce the save draft function to avoid saving on every keystroke
  // To avoid overwhelming the backend with requests and save costs
  const debouncedSaveDraft = useDebounceCallback(handleSaveDraft, 2000);
  useEffect(() => {
    if (!onSaveDraft) return;

    const subscription = watch((_, { name }) => {
      // Don't save if the field that changed is draftId or isDraft
      if (name === 'draftId' || name === 'isDraft') return;
      debouncedSaveDraft();
    });

    return () => subscription.unsubscribe();
  }, [watch, onSaveDraft, debouncedSaveDraft]);

  const handleDeleteDraft = async () => {
    if (!onDeleteDraft) return;
    setDeletingDraft(true);
    try {
      const values = getValues();
      await onDeleteDraft(values.draftId);
    } finally {
      setDeletingDraft(false);
    }
  };

  const nodeOptions = activeNodes.map((n) => ({ value: String(n.id), label: n.name }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <BasicInfoFields register={register} errors={errors} />

      <TypeAndDateFields control={control} register={register} errors={errors} />

      <CategorySelector categories={categories} control={control} />

      <TagSelector tags={tags} control={control} />

      <LineItemsEditor
        control={control}
        register={register}
        errors={errors}
        fields={fields}
        append={append}
        remove={remove}
        isSimplifiedMode={isSimplifiedMode}
        setIsSimplifiedMode={setIsSimplifiedMode}
        setValue={setValue}
        firstAmount={firstAmount}
        nodeOptions={nodeOptions}
      />

      {/* Receipt URL */}
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
          disabled={!isDirty && !!defaultValues?.id && !defaultValues?.isDraft}
          className="w-full"
        >
          {submitLabel ?? t('common.save')}
        </Button>
      </div>
    </form>
  );
}
