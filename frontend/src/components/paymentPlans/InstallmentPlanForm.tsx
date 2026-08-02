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
import {
  nameField,
  descriptionField,
  optionalAmountField,
  requiredCountField,
  toOptionalNumber,
} from '@/lib/validation';
import { findFirstFieldErrorMessage } from '@/lib/formErrors';
import { prependMissingArchived } from '@/lib/prependMissingArchived';
import { formatDateFromParts, getLocalizedTodayString } from '@/lib/format';

const DEFAULT_TOTAL_INSTALLMENTS = 12;
const DEFAULT_FREQUENCY: SchedulableFrequency = 'MONTHLY';

function buildSchema(t: (key: string) => string) {
  return z
    .object({
      name: nameField(t),
      description: descriptionField(t),
      totalInstallments: requiredCountField(t),
      frequency: z.enum(SCHEDULABLE_FREQUENCIES, { error: t('common.required') }),
      startDate: z.string().min(1, t('common.required')),
      totalAmount: optionalAmountField(t),
      installmentAmount: optionalAmountField(t),
      isAutomated: z.boolean(),
      autoCreateDraft: z.boolean(),
      templateId: z.number().nullable(),
      categoryId: z.number().nullable(),
      tagIds: z.array(z.number()),
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
      totalInstallments: DEFAULT_TOTAL_INSTALLMENTS,
      frequency: DEFAULT_FREQUENCY,
      startDate: getLocalizedTodayString(),
      totalAmount: undefined,
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
    totalInstallments: plan.totalInstallments ?? DEFAULT_TOTAL_INSTALLMENTS,
    frequency: toSchedulableFrequency(plan.frequency),
    startDate: plan.startDate,
    totalAmount: plan.totalAmount ?? undefined,
    installmentAmount: plan.installmentAmount ?? undefined,
    isAutomated: plan.isAutomated,
    autoCreateDraft: plan.autoCreateDraft,
    templateId: plan.template?.id ?? null,
    categoryId: plan.category?.id ?? null,
    tagIds: plan.tags?.map((tag) => tag.id) ?? [],
  };
}

interface InstallmentPlanFormProps {
  readonly editTarget?: PaymentPlan | null;
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
}

export function InstallmentPlanForm({ editTarget, onCancel, onSuccess }: InstallmentPlanFormProps) {
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
      planType: 'INSTALLMENT',
      totalInstallments: values.totalInstallments,
      totalAmount: values.totalAmount,
      installmentAmount: values.isAutomated ? values.installmentAmount : undefined,
      frequency: values.frequency,
      startDate: values.startDate,
      isAutomated: values.isAutomated,
      autoCreateDraft: values.autoCreateDraft,
      templateId: values.isAutomated ? values.templateId ?? undefined : undefined,
      generateItems: true,
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
        placeholder={t('paymentPlans.installmentNamePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea label={t('common.description')} error={errors.description?.message} {...register('description')} />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('paymentPlans.installmentsLabel')}
          type="number"
          error={errors.totalInstallments?.message}
          {...register('totalInstallments', { setValueAs: toOptionalNumber })}
        />
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="startDate"
          control={control}
          render={({ field }) => (
            <Input
              label={t('paymentPlans.firstCuotaDateLabel')}
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
        <Input
          label={t('paymentPlans.totalAmountLabel')}
          type="number"
          step="0.01"
          error={errors.totalAmount?.message}
          {...register('totalAmount', { setValueAs: toOptionalNumber })}
        />
      </div>

      <ScheduleWindowHint control={control} />

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
            label={t('paymentPlans.installmentAmountLabel')}
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

/**
 * A cuota plan states no end date: its window is the cuota count times the cadence. Showing the
 * date it lands on is what makes the rule that bounds every cuota visible while it is being set.
 */
function ScheduleWindowHint({ control }: { readonly control: ReturnType<typeof useForm<FormValues>>['control'] }) {
  const { t } = useTranslation();
  const [startDate, totalInstallments, frequency] = useWatch({
    control,
    name: ['startDate', 'totalInstallments', 'frequency'],
  });

  const lastCuotaDate = deriveLastCuotaDate(startDate, totalInstallments, frequency);
  if (!lastCuotaDate) return null;

  return (
    <p className="text-xs text-dn-text-muted leading-relaxed">
      {t('paymentPlans.scheduleWindowHint', { count: totalInstallments, date: formatDateFromParts(lastCuotaDate) })}
    </p>
  );
}

function deriveLastCuotaDate(
  startDate: string,
  totalInstallments: number | undefined,
  frequency: FormValues['frequency']
): string | null {
  if (!startDate || !totalInstallments || totalInstallments < 1) return null;

  const cycles = totalInstallments - 1;
  const last = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(last.getTime())) return null;

  if (frequency === 'DAILY') last.setDate(last.getDate() + cycles);
  if (frequency === 'WEEKLY') last.setDate(last.getDate() + cycles * 7);
  if (frequency === 'MONTHLY') last.setMonth(last.getMonth() + cycles);
  if (frequency === 'YEARLY') last.setFullYear(last.getFullYear() + cycles);

  return last.toISOString().slice(0, 'YYYY-MM-DD'.length);
}

function toSchedulableFrequency(frequency?: string): SchedulableFrequency {
  const isSchedulable = SCHEDULABLE_FREQUENCIES.some((candidate) => candidate === frequency);
  return isSchedulable ? (frequency as SchedulableFrequency) : DEFAULT_FREQUENCY;
}
