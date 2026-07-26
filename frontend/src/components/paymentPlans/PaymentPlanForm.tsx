import { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import type { PaymentPlan, CreatePaymentPlanDto, PaymentPlanStatus, RecurrenceFrequency } from '@/models';
import { useCreatePaymentPlan, useUpdatePaymentPlan } from '@/hooks/usePaymentPlans';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  nameField,
  descriptionField,
  optionalAmountField,
  optionalNumberField,
  toOptionalNumber,
} from '@/lib/validation';
import { findFirstFieldErrorMessage } from '@/lib/formErrors';
import { prependMissingArchived } from '@/lib/prependMissingArchived';
import { getLocalizedTodayString } from '@/lib/format';
import { isGroupPlan, isUserComposedPlan } from '@/components/paymentPlans/planPresentation';

const DEFAULT_TOTAL_INSTALLMENTS = 12;
const DEFAULT_FREQUENCY: RecurrenceFrequency = 'MONTHLY';
const PLAN_STATUSES: PaymentPlanStatus[] = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];

function recurringFrequency(frequency: RecurrenceFrequency): RecurrenceFrequency {
  return frequency === 'INSTANT' ? DEFAULT_FREQUENCY : frequency;
}

function buildSchema(t: (key: string) => string) {
  return z.object({
    name: nameField(t),
    description: descriptionField(t),
    planType: z.enum(['RECURRING', 'INSTALLMENT', 'CUSTOM', 'GROUP'], { error: t('common.required') }),
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'], { error: t('common.required') }),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'INSTANT'], { error: t('common.required') }),
    totalInstallments: optionalNumberField(t),
    totalAmount: optionalAmountField(t),
    installmentAmount: optionalAmountField(t),
    startDate: z.string().min(1, t('common.required')),
    isAutomated: z.boolean(),
    autoCreateDraft: z.boolean(),
    generateItems: z.boolean(),
    originNodeId: z.number().nullable(),
    destinationNodeId: z.number().nullable(),
    categoryId: z.number().nullable(),
    tagIds: z.array(z.number()),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function toFormValues(plan?: PaymentPlan | null): FormValues {
  if (!plan) {
    return {
      name: '',
      description: '',
      planType: 'INSTALLMENT',
      status: 'ACTIVE',
      frequency: 'MONTHLY',
      totalInstallments: DEFAULT_TOTAL_INSTALLMENTS,
      totalAmount: undefined,
      installmentAmount: undefined,
      startDate: getLocalizedTodayString(),
      isAutomated: true,
      autoCreateDraft: true,
      generateItems: true,
      originNodeId: null,
      destinationNodeId: null,
      categoryId: null,
      tagIds: [],
    };
  }

  return {
    name: plan.name,
    description: plan.description ?? '',
    planType: plan.planType,
    status: plan.status,
    frequency: plan.frequency,
    totalInstallments: plan.totalInstallments ?? undefined,
    totalAmount: plan.totalAmount ?? undefined,
    installmentAmount: plan.installmentAmount ?? undefined,
    startDate: plan.startDate,
    isAutomated: plan.isAutomated,
    autoCreateDraft: plan.autoCreateDraft,
    generateItems: false,
    originNodeId: plan.originNode?.id ?? null,
    destinationNodeId: plan.destinationNode?.id ?? null,
    categoryId: plan.category?.id ?? null,
    tagIds: plan.tags?.map((tag) => tag.id) ?? [],
  };
}

function toCreateDto(values: FormValues): CreatePaymentPlanDto {
  const isInstallment = values.planType === 'INSTALLMENT';
  const isGroup = isGroupPlan(values.planType);

  return {
    name: values.name,
    description: values.description || undefined,
    planType: values.planType,
    status: isUserComposedPlan(values.planType) ? values.status : undefined,
    frequency: isGroup ? 'INSTANT' : recurringFrequency(values.frequency),
    totalInstallments: isInstallment ? values.totalInstallments : undefined,
    totalAmount: isInstallment ? values.totalAmount : undefined,
    installmentAmount: isGroup ? undefined : values.installmentAmount,
    startDate: values.startDate,
    isAutomated: !isGroup && values.isAutomated,
    autoCreateDraft: !isGroup && values.autoCreateDraft,
    generateItems: !isGroup && values.generateItems,
    originNodeId: values.originNodeId ?? undefined,
    destinationNodeId: values.destinationNodeId ?? undefined,
    categoryId: values.categoryId ?? undefined,
    tagIds: values.tagIds,
  };
}

interface PaymentPlanFormProps {
  editTarget?: PaymentPlan | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function PaymentPlanForm({ editTarget, onCancel, onSuccess }: PaymentPlanFormProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const createPlan = useCreatePaymentPlan();
  const updatePlan = useUpdatePaymentPlan();

  const { data: categoriesResponse } = useCategories();
  const { data: tagsResponse } = useTags();
  const { data: nodesResponse } = useNodes(true);

  const baseCategory = editTarget?.category;
  const baseTags = useMemo(() => editTarget?.tags ?? [], [editTarget?.tags]);

  const categories = useMemo(
    () => prependMissingArchived(categoriesResponse ?? [], baseCategory ? [baseCategory] : []),
    [categoriesResponse, baseCategory]
  );

  const tags = useMemo(() => prependMissingArchived(tagsResponse ?? [], baseTags), [tagsResponse, baseTags]);

  const nodeOptions = useMemo(
    () => (nodesResponse ?? []).map((node) => ({ value: String(node.id), label: node.name })),
    [nodesResponse]
  );

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

  const selectedPlanType = useWatch({ control, name: 'planType' });
  const isAutomated = useWatch({ control, name: 'isAutomated' });
  const isGroup = isGroupPlan(selectedPlanType);
  const canChooseStatus = !!editTarget && isUserComposedPlan(selectedPlanType);

  const reportInvalidSubmit = (fieldErrors: FieldErrors<FormValues>) => {
    alert.error(findFirstFieldErrorMessage(fieldErrors) ?? t('common.validationError'));
  };

  const submitPlan = (values: FormValues) => {
    const dto = toCreateDto(values);

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
        placeholder={t('paymentPlans.namePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea
        label={t('common.description')}
        error={errors.description?.message}
        {...register('description')}
      />

      <div className={isGroup ? '' : 'grid grid-cols-2 gap-3'}>
        <Controller
          name="planType"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t('paymentPlans.typeLabel')}
              options={[
                { value: 'INSTALLMENT', label: t('paymentPlans.types.INSTALLMENT') },
                { value: 'RECURRING', label: t('paymentPlans.types.RECURRING') },
                { value: 'GROUP', label: t('paymentPlans.types.GROUP') },
                { value: 'CUSTOM', label: t('paymentPlans.types.CUSTOM') },
              ]}
              error={errors.planType?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {!isGroup && (
          <Controller
            name="frequency"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label={t('paymentPlans.frequencyLabel')}
                options={[
                  { value: 'DAILY', label: t('subscriptions.recurrence.DAILY') },
                  { value: 'WEEKLY', label: t('subscriptions.recurrence.WEEKLY') },
                  { value: 'MONTHLY', label: t('subscriptions.recurrence.MONTHLY') },
                  { value: 'YEARLY', label: t('subscriptions.recurrence.YEARLY') },
                ]}
                error={errors.frequency?.message}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        )}
      </div>

      {isGroup && <p className="text-xs text-dn-text-muted leading-relaxed">{t('paymentPlans.groupHint')}</p>}

      {canChooseStatus && (
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t('paymentPlans.statusLabel')}
              options={PLAN_STATUSES.map((status) => ({
                value: status,
                label: t(`paymentPlans.status.${status}`),
              }))}
              error={errors.status?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}

      <div className={isGroup ? '' : 'grid grid-cols-2 gap-3'}>
        {!isGroup && (
          <Input
            label={t('paymentPlans.installmentAmountLabel')}
            type="number"
            step="0.01"
            error={errors.installmentAmount?.message}
            {...register('installmentAmount', { setValueAs: toOptionalNumber })}
          />
        )}
        <Controller
          name="startDate"
          control={control}
          render={({ field }) => (
            <Input
              label={isGroup ? t('paymentPlans.groupDateLabel') : t('paymentPlans.startDateLabel')}
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
      </div>

      {selectedPlanType === 'INSTALLMENT' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('paymentPlans.installmentsLabel')}
            type="number"
            error={errors.totalInstallments?.message}
            {...register('totalInstallments', { setValueAs: toOptionalNumber })}
          />
          <Input
            label={t('paymentPlans.totalAmountLabel')}
            type="number"
            step="0.01"
            error={errors.totalAmount?.message}
            {...register('totalAmount', { setValueAs: toOptionalNumber })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="originNodeId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t('paymentPlans.originNode')}
              placeholder={t('common.none')}
              options={nodeOptions}
              value={field.value == null ? '' : String(field.value)}
              onChange={(value) => field.onChange(value ? Number(value) : null)}
            />
          )}
        />
        <Controller
          name="destinationNodeId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t('paymentPlans.destinationNode')}
              placeholder={t('common.none')}
              options={nodeOptions}
              value={field.value == null ? '' : String(field.value)}
              onChange={(value) => field.onChange(value ? Number(value) : null)}
            />
          )}
        />
      </div>

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
          />
        )}
      />

      {!isGroup && (
        <Controller
          name="isAutomated"
          control={control}
          render={({ field }) => (
            <SegmentedControl
              label={t('paymentPlans.isAutomated')}
              options={[
                { value: 'AUTOMATED', label: t('paymentPlans.automated') },
                { value: 'MANUAL', label: t('paymentPlans.manual') },
              ]}
              value={field.value ? 'AUTOMATED' : 'MANUAL'}
              onChange={(value) => field.onChange(value === 'AUTOMATED')}
            />
          )}
        />
      )}

      {!isGroup && isAutomated && (
        <label className="flex items-center gap-3 bg-dn-surface-low rounded-input px-4 py-3 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('autoCreateDraft')}
            className="w-4 h-4 shrink-0 accent-dn-primary bg-dn-surface-low"
          />
          <span className="text-sm text-dn-text-main">{t('paymentPlans.autoCreateDraft')}</span>
        </label>
      )}

      {!editTarget && selectedPlanType === 'INSTALLMENT' && (
        <label className="flex items-center gap-3 bg-dn-surface-low rounded-input px-4 py-3 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('generateItems')}
            className="w-4 h-4 shrink-0 accent-dn-primary bg-dn-surface-low"
          />
          <div className="flex flex-col">
            <span className="text-sm text-dn-text-main">{t('paymentPlans.generateItems')}</span>
            <span className="text-xs text-dn-text-muted">{t('paymentPlans.generateItemsHint')}</span>
          </div>
        </label>
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
