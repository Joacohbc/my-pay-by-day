import { useState } from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import type { CreatePaymentPlanDto } from '@/models';
import { useCreatePaymentPlan } from '@/hooks/usePaymentPlans';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { GroupMembersPicker } from '@/components/paymentPlans/GroupMembersPicker';
import { nameField, descriptionField } from '@/lib/validation';
import { findFirstFieldErrorMessage } from '@/lib/formErrors';
import { getLocalizedTodayString } from '@/lib/format';

function buildSchema(t: (key: string) => string) {
  return z.object({
    name: nameField(t),
    description: descriptionField(t),
    startDate: z.string().min(1, t('common.required')),
    categoryId: z.number().nullable(),
    tagIds: z.array(z.number()),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface GroupPlanFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function GroupPlanForm({ onCancel, onSuccess }: GroupPlanFormProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const createPlan = useCreatePaymentPlan();

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const [eventIds, setEventIds] = useState<number[]>([]);
  const [draftIds, setDraftIds] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      name: '',
      description: '',
      startDate: getLocalizedTodayString(),
      categoryId: null,
      tagIds: [],
    },
  });

  const memberCount = eventIds.length + draftIds.length;

  const reportInvalidSubmit = (fieldErrors: FieldErrors<FormValues>) => {
    alert.error(findFirstFieldErrorMessage(fieldErrors) ?? t('common.validationError'));
  };

  const submitPlan = (values: FormValues) => {
    const dto: CreatePaymentPlanDto = {
      name: values.name,
      description: values.description || undefined,
      planType: 'GROUP',
      frequency: 'INSTANT',
      startDate: values.startDate,
      isAutomated: false,
      autoCreateDraft: false,
      generateItems: false,
      categoryId: values.categoryId ?? undefined,
      tagIds: values.tagIds,
      eventIds: eventIds.length > 0 ? eventIds : undefined,
      draftIds: draftIds.length > 0 ? draftIds : undefined,
    };
    createPlan.mutate(dto, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit(submitPlan, reportInvalidSubmit)} className="space-y-4">
      <Input
        label={t('paymentPlans.nameLabel')}
        placeholder={t('paymentPlans.groupNamePlaceholder')}
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea
        label={t('common.description')}
        error={errors.description?.message}
        {...register('description')}
      />

      <Controller
        name="startDate"
        control={control}
        render={({ field }) => (
          <Input
            label={t('paymentPlans.groupDateLabel')}
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

      <GroupMembersPicker
        eventIds={eventIds}
        draftIds={draftIds}
        onChangeEventIds={setEventIds}
        onChangeDraftIds={setDraftIds}
      />

      <p className="text-xs text-dn-text-muted leading-relaxed">
        {memberCount > 0 ? t('paymentPlans.groupMembersCount', { count: memberCount }) : t('paymentPlans.groupHint')}
      </p>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" loading={createPlan.isPending}>
          {t('common.create')}
        </Button>
      </div>
    </form>
  );
}
