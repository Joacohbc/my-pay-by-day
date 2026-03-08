import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { Icon } from '@/components/ui/Icon';
import type { CreateEventDto, EventType, FinanceEvent } from '@/models';
import { toLocalDateTimeString } from '@/lib/format';

// ─── Schema ──────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  nodeId: z.string().min(1, 'Required'),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) !== 0, {
    message: 'Must be a non-zero number',
  }),
});

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  type: z.enum(['INBOUND', 'OUTBOUND', 'OTHER']),
  transactionDate: z.string().min(1, 'Date is required'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item required'),
});

type FormValues = z.infer<typeof schema>;

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
  onSubmit: (dto: CreateEventDto) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
}

export function EventForm({
  defaultValues,
  preset,
  onSubmit,
  submitLabel,
  loading = false,
}: EventFormProps) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: nodes = [] } = useNodes();

  const activeNodes = nodes.filter((n) => !n.archived);

  const initialType = defaultValues?.type ?? preset?.type ?? 'OUTBOUND';

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      receiptUrl: defaultValues?.receiptUrl ?? '',
      type: defaultValues?.type ?? preset?.type ?? 'OUTBOUND',
      transactionDate: defaultValues?.transactionDate
        ? toLocalDateTimeString(new Date(defaultValues.transactionDate))
        : toLocalDateTimeString(new Date()),
      categoryId: defaultValues?.category
        ? String(defaultValues.category.id)
        : preset?.categoryId
        ? String(preset.categoryId)
        : '',
      tagIds: defaultValues?.tags?.map((t) => String(t.id)) ?? preset?.tagIds ?? [],
      lineItems:
        defaultValues?.lineItems?.map((li) => ({
          nodeId: String(li.financeNodeId),
          amount: initialType !== 'OTHER' ? String(Math.abs(li.amount)) : String(li.amount),
        })) ??
        (preset?.lineNodeIds?.length
          ? preset.lineNodeIds.map((id) => ({ nodeId: String(id), amount: '' }))
          : [{ nodeId: '', amount: '' }]),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const watchType = watch('type');
  const isTemplateMode = !!(preset?.lineNodeIds && preset.lineNodeIds.length >= 2);
  const firstAmount = watch('lineItems.0.amount');

  useEffect(() => {
    if (!isTemplateMode) return;
    for (let i = 1; i < fields.length; i++) {
      setValue(`lineItems.${i}.amount`, firstAmount ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstAmount, isTemplateMode, fields.length]);

  const getLineItemSignMultiplier = (type: string, index: number): 1 | -1 => {
    if (type === 'INBOUND') return index % 2 === 0 ? 1 : -1;
    if (type === 'OUTBOUND') return index % 2 === 0 ? -1 : 1;
    return 1;
  };

  const handleFormSubmit = async (values: FormValues) => {
    const dto: CreateEventDto = {
      name: values.name,
      description: values.description || undefined,
      receiptUrl: values.receiptUrl || undefined,
      type: values.type,
      transaction: {
        transactionDate: new Date(values.transactionDate).toISOString(),
        lineItems: values.lineItems.map((li, i) => ({
          financeNode: { id: Number(li.nodeId) },
          amount:
            values.type !== 'OTHER'
              ? getLineItemSignMultiplier(values.type, i) * Math.abs(Number(li.amount))
              : Number(li.amount),
        })),
      },
      category: values.categoryId ? { id: Number(values.categoryId) } : undefined,
      tags: values.tagIds?.map((id) => ({ id: Number(id) })),
    };
    await onSubmit(dto);
  };

  const nodeOptions = activeNodes.map((n) => ({ value: String(n.id), label: n.name }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Basic Info */}
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

      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              label={t('eventForm.type')}
              error={errors.type?.message}
              options={[
                { value: 'INBOUND', label: t('eventType.INBOUND') },
                { value: 'OUTBOUND', label: t('eventType.OUTBOUND') },
                { value: 'OTHER', label: t('eventType.OTHER') },
              ]}
              {...field}
            />
          )}
        />

        <Input
          type="datetime-local"
          label={t('eventForm.dateTime')}
          error={errors.transactionDate?.message}
          {...register('transactionDate')}
        />
      </div>

      {/* Category & Tags */}
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Select
              label={t('eventForm.category')}
              placeholder={t('common.none')}
              options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
              {...field}
            />
          )}
        />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
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
      )}

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">{t('eventForm.lineItems')}</p>
          {!isTemplateMode && (
            <button
              type="button"
              onClick={() => append({ nodeId: '', amount: '' })}
              className="flex items-center gap-1 text-xs text-dn-primary hover:brightness-110 transition-all"
            >
              <Icon name="add" className="text-sm" />
              {t('eventForm.addLineItem')}
            </button>
          )}
        </div>
        {errors.lineItems?.root?.message && (
          <p className="text-xs text-dn-error mb-2">{errors.lineItems.root.message}</p>
        )}

        {isTemplateMode ? (
          /* Template mode: node rows with sign badge + single shared amount input */
          <div className="space-y-3">
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-3 px-3 py-2 rounded-input bg-dn-surface-low">
                  {watchType !== 'OTHER' && (
                    <span
                      className={[
                        'text-sm font-bold w-4 text-center shrink-0',
                        getLineItemSignMultiplier(watchType, i) === 1
                          ? 'text-dn-success'
                          : 'text-dn-error',
                      ].join(' ')}
                    >
                      {getLineItemSignMultiplier(watchType, i) === 1 ? '+' : '−'}
                    </span>
                  )}
                  <div className="flex-1">
                    <Controller
                      name={`lineItems.${i}.nodeId`}
                      control={control}
                      render={({ field: f }) => (
                        <Select
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
              placeholder="0.00"
              type="number"
              step="0.01"
              min="0.01"
              error={errors.lineItems?.[0]?.amount?.message}
              {...register('lineItems.0.amount')}
            />
          </div>
        ) : (
          /* Normal mode: per-row node + amount */
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="flex gap-2 items-center">
                <div className="flex-1">
                  <Controller
                    name={`lineItems.${i}.nodeId`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        placeholder={t('eventForm.selectNode')}
                        options={nodeOptions}
                        error={errors.lineItems?.[i]?.nodeId?.message}
                        {...f}
                      />
                    )}
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {watchType !== 'OTHER' && (
                    <span
                      className={[
                        'text-sm font-bold w-4 text-center shrink-0',
                        getLineItemSignMultiplier(watchType, i) === 1
                          ? 'text-dn-success'
                          : 'text-dn-error',
                      ].join(' ')}
                    >
                      {getLineItemSignMultiplier(watchType, i) === 1 ? '+' : '−'}
                    </span>
                  )}
                  <div className="w-24">
                    <Input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min={watchType !== 'OTHER' ? '0.01' : undefined}
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
          {watchType !== 'OTHER'
            ? t('eventForm.signedAmountHint')
            : t('eventForm.manualAmountHint')}
        </p>
      </div>

      {/* Receipt URL */}
      <Input
        label={t('eventForm.receiptUrl')}
        placeholder={t('eventForm.receiptUrlPlaceholder')}
        type="url"
        {...register('receiptUrl')}
      />

      <Button type="submit" fullWidth loading={loading}>
        {submitLabel ?? t('common.save')}
      </Button>
    </form>
  );
}
