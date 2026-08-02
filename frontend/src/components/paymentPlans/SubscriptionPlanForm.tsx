import { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import type { CreatePaymentPlanDto, PaymentPlan } from '@/models';
import { useCreatePaymentPlan, useUpdatePaymentPlan } from '@/hooks/usePaymentPlans';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TemplateSelect } from '@/components/paymentPlans/TemplateSelect';
import { SCHEDULABLE_FREQUENCIES, type SchedulableFrequency } from '@/components/paymentPlans/planPresentation';
import { nameField, descriptionField, optionalAmountField, toOptionalNumber } from '@/lib/validation';
import { findFirstFieldErrorMessage } from '@/lib/formErrors';
import { prependMissingArchived } from '@/lib/prependMissingArchived';
import { getLocalizedTodayString } from '@/lib/format';

const DEFAULT_FREQUENCY: SchedulableFrequency = 'MONTHLY';

function buildSchema(t: (key: string) => string) {
  return z
    .object({
      name: nameField(t),
      description: descriptionField(t),
      frequency: z.enum(SCHEDULABLE_FREQUENCIES, { error: t('common.required') }),
      startDate: z.string().min(1, t('common.required')),
      endDate: z.string(),
      installmentAmount: optionalAmountField(t),
      isAutomated: z.boolean(),
      autoCreateDraft: z.boolean(),
      templateId: z.number().nullable(),
      categoryId: z.number().nullable(),
      tagIds: z.array(z.number()),
    })
    .refine((values) => !values.endDate || values.endDate >= values.startDate, {
      path: ['endDate'],
      error: t('paymentPlans.endBeforeStart'),
    })
    .refine((values) => !values.isAutomated || values.templateId != null, {
      path: ['templateId'],
      error: t('paymentPlans.templateRequired'),
    })
    .refine((values) => !values.isAutomated || (values.installmentAmount ?? 0) > 0, {
      path: ['installmentAmount'],
      error: t('paymentPlans.amountRequiredWhenAutomated'),
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function toFormValues(plan?: PaymentPlan | null): FormValues {
  if (!plan) {
    return {
      name: '',
      description: '',
      frequency: DEFAULT_FREQUENCY,
      startDate: getLocalizedTodayString(),
      endDate: '',
      installmentAmount: undefined,
      isAutomated: false,
      autoCreateDraft: true,
      templateId: null,
      categoryId: null,
      tagIds: [],
    };
  }

  return {
    name: plan.name,
    description: plan.description ?? '',
    frequency: toSchedulableFrequency(plan.frequency),
    startDate: plan.startDate,
    endDate: plan.endDate ?? '',
    installmentAmount: plan.installmentAmount ?? undefined,
    isAutomated: plan.isAutomated,
    autoCreateDraft: plan.autoCreateDraft,
    templateId: plan.template?.id ?? null,
    categoryId: plan.category?.id ?? null,
    tagIds: plan.tags?.map((tag) => tag.id) ?? [],
  };
}

interface SubscriptionPlanFormProps {
  readonly editTarget?: PaymentPlan | null;
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
}

export function SubscriptionPlanForm({ editTarget, onCancel, onSuccess }: SubscriptionPlanFormProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const createPlan = useCreatePaymentPlan();
  const updatePlan = useUpdatePaymentPlan();

  const { data: categoriesResponse } = useCategories();
  const { data: tagsResponse } = useTags();

  const baseCategory = editTarget?.category;
  const baseTags = useMemo(() => editTarget?.tags ?? [], [editTarget?.tags]);
  const categories = useMemo(
    () => prependMissingArchived(categoriesResponse ?? [], baseCategory ? [baseCategory] : []),
    [categoriesResponse, baseCategory]
  );
  const tags = useMemo(() => prependMissingArchived(tagsResponse ?? [], baseTags), [tagsResponse, baseTags]);

  const defaultValues = useMemo(() => toFormValues(editTarget), [editTarget]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const isAutomated = useWatch({ control, name: 'isAutomated' });

  const reportInvalidSubmit = (fieldErrors: FieldErrors<FormValues>) => {
    alert.error(findFirstFieldErrorMessage(fieldErrors) ?? t('common.validationError'));
  };

  const submitPlan = (values: FormValues) => {
    const dto: CreatePaymentPlanDto = {
      name: values.name,
      description: values.description || undefined,
      planType: 'RECURRING',
      installmentAmount: values.isAutomated ? values.installmentAmount : undefined,
      frequency: values.frequency,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      isAutomated: values.isAutomated,
      autoCreateDraft: values.autoCreateDraft,
      templateId: values.isAutomated ? values.templateId ?? undefined : undefined,
      generateItems: false,
      categoryId: values.categoryId ?? undefined,
      tagIds: values.tagIds,
    };

    if (editTarget) {
      updatePlan.mutate({ id: editTarget.id, dto }, { onSuccess });
      return;
    }
    createPlan.mutate(dto, { onSuccess });
  };

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <form onSubmit={handleSubmit(submitPlan, reportInvalidSubmit)} className="space-y-4">
      <Input
        label={t('paymentPlans.nameLabel')}
        placeholder={t('paymentPlans.subscriptionNamePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea label={t('common.description')} error={errors.description?.message} {...register('description')} />

      <Controller
        name="frequency"
        control={control}
        render={({ field }) => (
          <SearchableSelect
            label={t('paymentPlans.frequencyLabel')}
            options={SCHEDULABLE_FREQUENCIES.map((frequency) => ({
              value: frequency,
              label: t(`subscriptions.recurrence.${frequency}`),
            }))}
            error={errors.frequency?.message}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="startDate"
          control={control}
          render={({ field }) => (
            <Input
              label={t('paymentPlans.startDateLabel')}
              type="date"
              error={errors.startDate?.message}
              name={field.name}
              ref={field.ref}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          name="endDate"
          control={control}
          render={({ field }) => (
            <Input
              label={t('paymentPlans.endDateOptionalLabel')}
              type="date"
              error={errors.endDate?.message}
              name={field.name}
              ref={field.ref}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>

      <p className="text-xs text-dn-text-muted leading-relaxed">{t('paymentPlans.subscriptionHint')}</p>

      <Controller
        name="categoryId"
        control={control}
        render={({ field }) => (
          <CategorySelector
            categories={categories}
            value={field.value == null ? '' : String(field.value)}
            onChange={(value) => field.onChange(value ? Number(value) : null)}
            showAdd
            collapsible
          />
        )}
      />

      <Controller
        name="tagIds"
        control={control}
        render={({ field }) => (
          <TagSelector
            tags={tags}
            value={field.value.map(String)}
            onChange={(ids) => field.onChange(ids.map(Number))}
            showAdd
            collapsible
          />
        )}
      />

      <Controller
        name="isAutomated"
        control={control}
        render={({ field }) => (
          <SegmentedControl
            label={t('paymentPlans.isAutomated')}
            options={[
              { value: 'MANUAL', label: t('paymentPlans.manual') },
              { value: 'AUTOMATED', label: t('paymentPlans.automated') },
            ]}
            value={field.value ? 'AUTOMATED' : 'MANUAL'}
            onChange={(value) => field.onChange(value === 'AUTOMATED')}
          />
        )}
      />

      {!isAutomated && <p className="text-xs text-dn-text-muted leading-relaxed">{t('paymentPlans.manualHint')}</p>}

      {isAutomated && (
        <>
          <Controller
            name="templateId"
            control={control}
            render={({ field }) => (
              <TemplateSelect
                value={field.value}
                onChange={field.onChange}
                error={errors.templateId?.message}
                selectedTemplate={editTarget?.template}
              />
            )}
          />
          <p className="text-xs text-dn-text-muted leading-relaxed">{t('paymentPlans.templateHint')}</p>

          <Input
            label={t('paymentPlans.cycleAmountLabel')}
            type="number"
            step="0.01"
            error={errors.installmentAmount?.message}
            {...register('installmentAmount', { setValueAs: toOptionalNumber })}
          />

          <label className="flex items-center gap-3 bg-dn-surface-low rounded-input px-4 py-3 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('autoCreateDraft')}
              className="w-4 h-4 shrink-0 accent-dn-primary bg-dn-surface-low"
            />
            <span className="text-sm text-dn-text-main">{t('paymentPlans.autoCreateDraft')}</span>
          </label>
        </>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" loading={isPending}>
          {editTarget ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}

function toSchedulableFrequency(frequency?: string): SchedulableFrequency {
  const isSchedulable = SCHEDULABLE_FREQUENCIES.some((candidate) => candidate === frequency);
  return isSchedulable ? (frequency as SchedulableFrequency) : DEFAULT_FREQUENCY;
}
