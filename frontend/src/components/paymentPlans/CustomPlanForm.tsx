import { useEffect, useMemo } from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import type { CreatePaymentPlanDto, PaymentPlan, PaymentPlanStatus } from '@/models';
import { useCreatePaymentPlan, useUpdatePaymentPlan } from '@/hooks/usePaymentPlans';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { nameField, descriptionField } from '@/lib/validation';
import { findFirstFieldErrorMessage } from '@/lib/formErrors';
import { prependMissingArchived } from '@/lib/prependMissingArchived';
import { getLocalizedTodayString } from '@/lib/format';

const CUSTOM_PLAN_STATUSES: PaymentPlanStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED'];

function buildSchema(t: (key: string) => string) {
  return z
    .object({
      name: nameField(t),
      description: descriptionField(t),
      startDate: z.string().min(1, t('common.required')),
      endDate: z.string().min(1, t('common.required')),
      status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED'], { error: t('common.required') }),
      categoryId: z.number().nullable(),
      tagIds: z.array(z.number()),
    })
    .refine((values) => values.endDate >= values.startDate, {
      path: ['endDate'],
      error: t('paymentPlans.endBeforeStart'),
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function toFormValues(plan?: PaymentPlan | null): FormValues {
  if (!plan) {
    return {
      name: '',
      description: '',
      startDate: getLocalizedTodayString(),
      endDate: getLocalizedTodayString(),
      status: 'ACTIVE',
      categoryId: null,
      tagIds: [],
    };
  }

  return {
    name: plan.name,
    description: plan.description ?? '',
    startDate: plan.startDate,
    endDate: plan.endDate ?? plan.startDate,
    status: plan.status as FormValues['status'],
    categoryId: plan.category?.id ?? null,
    tagIds: plan.tags?.map((tag) => tag.id) ?? [],
  };
}

interface CustomPlanFormProps {
  readonly editTarget?: PaymentPlan | null;
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
}

/**
 * A custom plan is a window the user fills in by hand: a start, an end, and the items they add
 * inside it. It has no cadence to repeat on and nothing to generate, so it is always manual.
 */
export function CustomPlanForm({ editTarget, onCancel, onSuccess }: CustomPlanFormProps) {
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

  const reportInvalidSubmit = (fieldErrors: FieldErrors<FormValues>) => {
    alert.error(findFirstFieldErrorMessage(fieldErrors) ?? t('common.validationError'));
  };

  const submitPlan = (values: FormValues) => {
    const dto: CreatePaymentPlanDto = {
      name: values.name,
      description: values.description || undefined,
      planType: 'CUSTOM',
      status: editTarget ? values.status : undefined,
      startDate: values.startDate,
      endDate: values.endDate,
      isAutomated: false,
      autoCreateDraft: false,
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
        placeholder={t('paymentPlans.customNamePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea label={t('common.description')} error={errors.description?.message} {...register('description')} />

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
              label={t('paymentPlans.endDateLabel')}
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

      <p className="text-xs text-dn-text-muted leading-relaxed">{t('paymentPlans.customHint')}</p>

      {editTarget && (
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t('paymentPlans.statusLabel')}
              options={CUSTOM_PLAN_STATUSES.map((status) => ({
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
