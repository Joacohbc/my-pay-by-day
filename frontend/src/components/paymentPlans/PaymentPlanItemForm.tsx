import { useMemo, useState } from 'react';
import { useForm, Controller, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import type {
  CreatePaymentPlanItemDto,
  FinanceEvent,
  PaymentPlanItem,
  PaymentPlanItemStatus,
  PaymentPlanType,
} from '@/models';
import {
  useCreatePaymentPlanItem,
  useDeletePaymentPlanItem,
  useUpdatePaymentPlanItem,
} from '@/hooks/usePaymentPlans';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useEvent, useEvents } from '@/hooks/useEvents';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { eventNetAmount, formatCurrency, formatDate, getLocalizedTodayString } from '@/lib/format';
import { isGroupPlan, isUserComposedPlan } from '@/components/paymentPlans/planPresentation';
import { optionalAmountField, requiredCountField, toOptionalNumber } from '@/lib/validation';
import { findFirstFieldErrorMessage } from '@/lib/formErrors';

const ITEM_STATUSES: PaymentPlanItemStatus[] = ['PENDING', 'DRAFTED', 'PAID', 'SKIPPED', 'OVERDUE'];
const SELECTABLE_EVENTS_PAGE_SIZE = 50;

function describeEvent(event: FinanceEvent): string {
  const amount = formatCurrency(Math.abs(eventNetAmount(event)));
  const date = formatDate(event.transactionDate);
  return date ? `${event.name} · ${date} · ${amount}` : `${event.name} · ${amount}`;
}

function buildSchema(t: (key: string) => string) {
  return z
    .object({
      installmentNumber: requiredCountField(t),
      expectedDate: z.string().min(1, t('common.required')),
      expectedAmount: optionalAmountField(t),
      itemStatus: z.enum(['PENDING', 'DRAFTED', 'PAID', 'SKIPPED', 'OVERDUE'], { error: t('common.required') }),
      linkKind: z.enum(['NONE', 'EVENT', 'DRAFT']),
      linkedId: z.number().nullable(),
    })
    .refine((values) => values.linkKind === 'NONE' || values.linkedId != null, {
      path: ['linkedId'],
      error: t('common.required'),
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function resolveLinkKind(item?: PaymentPlanItem | null): 'NONE' | 'EVENT' | 'DRAFT' {
  if (item?.eventId) return 'EVENT';
  if (item?.draftId) return 'DRAFT';
  return 'NONE';
}

interface PaymentPlanItemFormProps {
  planId: number;
  planType: PaymentPlanType;
  editTarget?: PaymentPlanItem | null;
  nextInstallmentNumber?: number;
  defaultAmount?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export function PaymentPlanItemForm({
  planId,
  planType,
  editTarget,
  nextInstallmentNumber = 1,
  defaultAmount,
  onCancel,
  onSuccess,
}: PaymentPlanItemFormProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const createItem = useCreatePaymentPlanItem(planId);
  const updateItem = useUpdatePaymentPlanItem(planId);
  const deleteItem = useDeletePaymentPlanItem(planId);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: recentEvents } = useEvents({ page: 0, size: SELECTABLE_EVENTS_PAGE_SIZE });
  const { data: linkedEvent } = useEvent(editTarget?.eventId ?? 0);
  const { data: drafts } = useFinanceEventDrafts();

  const eventOptions = useMemo(() => {
    const selectable = recentEvents?.content ?? [];
    const isLinkedEventMissing = linkedEvent && !selectable.some((event) => event.id === linkedEvent.id);
    const events = isLinkedEventMissing ? [linkedEvent, ...selectable] : selectable;

    return events.map((event) => ({ value: String(event.id), label: describeEvent(event) }));
  }, [recentEvents, linkedEvent]);

  const draftOptions = useMemo(
    () =>
      (drafts ?? [])
        .filter((draft) => draft.draftId != null)
        .map((draft) => ({ value: String(draft.draftId), label: describeEvent(draft) })),
    [drafts]
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      installmentNumber: editTarget?.installmentNumber ?? nextInstallmentNumber,
      expectedDate: editTarget?.expectedDate ?? getLocalizedTodayString(),
      expectedAmount: editTarget?.expectedAmount ?? defaultAmount,
      itemStatus: editTarget?.itemStatus ?? 'PENDING',
      linkKind: resolveLinkKind(editTarget),
      linkedId: editTarget?.eventId ?? editTarget?.draftId ?? null,
    },
  });

  const linkKind = useWatch({ control, name: 'linkKind' });
  const canEditSchedule = isUserComposedPlan(planType);
  const isGroup = isGroupPlan(planType);

  const reportInvalidSubmit = (fieldErrors: FieldErrors<FormValues>) => {
    alert.error(findFirstFieldErrorMessage(fieldErrors) ?? t('common.validationError'));
  };

  const submitItem = (values: FormValues) => {
    const dto: CreatePaymentPlanItemDto = {
      installmentNumber: values.installmentNumber,
      expectedDate: values.expectedDate,
      expectedAmount: values.expectedAmount,
      itemStatus: values.itemStatus,
      eventId: values.linkKind === 'EVENT' ? values.linkedId ?? undefined : undefined,
      draftId: values.linkKind === 'DRAFT' ? values.linkedId ?? undefined : undefined,
    };

    if (editTarget) {
      updateItem.mutate({ itemId: editTarget.id, dto }, { onSuccess });
      return;
    }
    createItem.mutate(dto, { onSuccess });
  };

  const confirmDelete = async () => {
    if (!editTarget) return;
    await deleteItem.mutateAsync(editTarget.id);
    setIsConfirmOpen(false);
    onSuccess();
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <form onSubmit={handleSubmit(submitItem, reportInvalidSubmit)} className="space-y-4">
      <ConfirmModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={t('paymentPlans.itemDeleteConfirm')}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={deleteItem.isPending}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={isGroup ? t('paymentPlans.groupItemNumberLabel') : t('paymentPlans.itemNumberLabel')}
          type="number"
          disabled={!canEditSchedule}
          error={errors.installmentNumber?.message}
          {...register('installmentNumber', { setValueAs: toOptionalNumber })}
        />
        <Controller
          name="expectedDate"
          control={control}
          render={({ field }) => (
            <Input
              label={t('paymentPlans.expectedDate')}
              type="date"
              disabled={!canEditSchedule}
              error={errors.expectedDate?.message}
              name={field.name}
              ref={field.ref}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>

      <Input
        label={t('paymentPlans.expectedAmount')}
        type="number"
        step="0.01"
        disabled={!canEditSchedule}
        error={errors.expectedAmount?.message}
        {...register('expectedAmount', { setValueAs: toOptionalNumber })}
      />

      {!canEditSchedule && (
        <p className="text-xs text-dn-text-muted leading-relaxed">{t('paymentPlans.scheduleLockedHint')}</p>
      )}

      <Controller
        name="itemStatus"
        control={control}
        render={({ field }) => (
          <SearchableSelect
            label={t('paymentPlans.itemStatusLabel')}
            options={ITEM_STATUSES.map((status) => ({
              value: status,
              label: t(`paymentPlans.itemStatus.${status}`),
            }))}
            error={errors.itemStatus?.message}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <Controller
        name="linkKind"
        control={control}
        render={({ field }) => (
          <SegmentedControl
            label={t('paymentPlans.linkedRecord')}
            options={[
              { value: 'NONE', label: t('common.none') },
              { value: 'EVENT', label: t('paymentPlans.linkedEvent') },
              { value: 'DRAFT', label: t('paymentPlans.linkedDraft') },
            ]}
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              setValue('linkedId', null);
            }}
          />
        )}
      />

      {linkKind !== 'NONE' && (
        <Controller
          name="linkedId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={linkKind === 'EVENT' ? t('paymentPlans.linkedEvent') : t('paymentPlans.linkedDraft')}
              placeholder={t('common.select')}
              options={linkKind === 'EVENT' ? eventOptions : draftOptions}
              error={errors.linkedId?.message}
              value={field.value == null ? '' : String(field.value)}
              onChange={(value) => field.onChange(value ? Number(value) : null)}
            />
          )}
        />
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        {editTarget && canEditSchedule ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            title={t('common.delete')}
            onClick={() => setIsConfirmOpen(true)}
          >
            <Icon name="delete" className="text-base" />
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm" loading={isPending}>
            {editTarget ? t('common.update') : t('common.create')}
          </Button>
        </div>
      </div>
    </form>
  );
}
