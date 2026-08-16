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
import { EventCard } from '@/components/events/EventCard';
import { EventMultiSelectModal } from '@/components/events/EventMultiSelectModal';
import { DraftMultiSelectModal } from '@/components/events/DraftMultiSelectModal';
import { useEvent } from '@/hooks/useEvents';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { eventsService } from '@/services/events.service';
import { formatDateFromParts, getLocalizedTodayString } from '@/lib/format';
import { isGroupPlan } from '@/components/paymentPlans/planPresentation';
import { requiredCountField, toOptionalNumber } from '@/lib/validation';
import { findFirstFieldErrorMessage } from '@/lib/formErrors';

const ITEM_STATUSES: PaymentPlanItemStatus[] = ['PENDING', 'DRAFTED', 'PAID', 'SKIPPED', 'OVERDUE'];

function buildSchema(t: (key: string) => string) {
  return z
    .object({
      installmentNumber: requiredCountField(t),
      expectedDate: z.string().min(1, t('common.required')),
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
  /** Start of the window the plan covers; an item may never fall before it. */
  planStartDate?: string;
  /** End of that window, absent when the plan is open-ended. */
  planEndDate?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function PaymentPlanItemForm({
  planId,
  planType,
  editTarget,
  nextInstallmentNumber = 1,
  planStartDate,
  planEndDate,
  onCancel,
  onSuccess,
}: PaymentPlanItemFormProps) {
  const { t } = useTranslation();
  const alert = useAlert();
  const createItem = useCreatePaymentPlanItem(planId);
  const updateItem = useUpdatePaymentPlanItem(planId);
  const deleteItem = useDeletePaymentPlanItem(planId);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  /** undefined = follow editTarget's linked record; a value (including null) = the user changed it in this session. */
  const [eventOverride, setEventOverride] = useState<FinanceEvent | null | undefined>(undefined);
  const [draftOverride, setDraftOverride] = useState<FinanceEvent | null | undefined>(undefined);

  const { data: linkedEvent } = useEvent(editTarget?.eventId ?? 0);
  const { data: drafts } = useFinanceEventDrafts();

  const linkedDraft = useMemo(
    () => (drafts ?? []).find((draft) => draft.draftId === editTarget?.draftId) ?? null,
    [drafts, editTarget?.draftId]
  );

  const selectedEvent = eventOverride !== undefined ? eventOverride : (linkedEvent ?? null);
  const selectedDraft = draftOverride !== undefined ? draftOverride : linkedDraft;

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
      expectedDate: editTarget?.expectedDate ?? planStartDate ?? getLocalizedTodayString(),
      itemStatus: editTarget?.itemStatus ?? 'PENDING',
      linkKind: resolveLinkKind(editTarget),
      linkedId: editTarget?.eventId ?? editTarget?.draftId ?? null,
    },
  });

  const linkKind = useWatch({ control, name: 'linkKind' });
  const linkedId = useWatch({ control, name: 'linkedId' });
  const isGroup = isGroupPlan(planType);
  const selectedRecord = linkKind === 'EVENT' ? selectedEvent : linkKind === 'DRAFT' ? selectedDraft : null;

  const reportInvalidSubmit = (fieldErrors: FieldErrors<FormValues>) => {
    alert.error(findFirstFieldErrorMessage(fieldErrors) ?? t('common.validationError'));
  };

  const handleConfirmEvent = async (ids: Set<number>) => {
    const id = Array.from(ids)[0];
    const event = id != null ? await eventsService.getById(id) : null;
    setEventOverride(event);
    setValue('linkedId', event?.id ?? null, { shouldValidate: true });
    setIsEventModalOpen(false);
  };

  const handleConfirmDraft = (ids: Set<number>) => {
    const id = Array.from(ids)[0];
    const draft = id != null ? (drafts ?? []).find((candidate) => candidate.draftId === id) ?? null : null;
    setDraftOverride(draft);
    setValue('linkedId', draft?.draftId ?? null, { shouldValidate: true });
    setIsDraftModalOpen(false);
  };

  const clearLinkedRecord = () => {
    setEventOverride(null);
    setDraftOverride(null);
    setValue('linkedId', null, { shouldValidate: true });
  };

  const submitItem = (values: FormValues) => {
    const dto: CreatePaymentPlanItemDto = {
      installmentNumber: values.installmentNumber,
      expectedDate: values.expectedDate,
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
  const windowHint = describeWindow(t, isGroup, planStartDate, planEndDate);

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
              min={isGroup ? undefined : planStartDate}
              max={isGroup ? undefined : planEndDate}
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

      {windowHint && <p className="text-xs text-dn-text-muted leading-relaxed">{windowHint}</p>}

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
              setEventOverride(null);
              setDraftOverride(null);
            }}
          />
        )}
      />

      {linkKind !== 'NONE' && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
            {linkKind === 'EVENT' ? t('paymentPlans.linkedEvent') : t('paymentPlans.linkedDraft')}
          </p>

          {selectedRecord ? (
            <div className="p-2 border border-dn-primary/30 bg-dn-primary/5 rounded-2xl flex items-center justify-between gap-3">
              <EventCard event={selectedRecord} disableLink />
              <button
                type="button"
                onClick={clearLinkedRecord}
                className="shrink-0 flex items-center justify-center rounded-full p-2 text-dn-error hover:bg-dn-error/10 transition-colors"
                title={t('common.clear')}
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => (linkKind === 'EVENT' ? setIsEventModalOpen(true) : setIsDraftModalOpen(true))}
            >
              <Icon name="add" className="text-sm" />
              {t('common.select')}
            </Button>
          )}

          {errors.linkedId?.message && <p className="text-xs text-dn-error px-1">{errors.linkedId.message}</p>}
        </div>
      )}

      <EventMultiSelectModal
        open={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={t('paymentPlans.linkedEvent')}
        onConfirm={handleConfirmEvent}
        minSelection={0}
        maxSelection={1}
        initialSelectedIds={linkedId != null ? new Set([linkedId]) : new Set()}
      />

      <DraftMultiSelectModal
        open={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        title={t('paymentPlans.linkedDraft')}
        onConfirm={handleConfirmDraft}
        minSelection={0}
        maxSelection={1}
        initialSelectedIds={linkedId != null ? new Set([linkedId]) : new Set()}
      />

      <div className="flex items-center justify-between gap-2 pt-2">
        {editTarget ? (
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

function describeWindow(
  t: (key: string, options?: Record<string, string>) => string,
  isGroup: boolean,
  planStartDate?: string,
  planEndDate?: string
): string | null {
  if (isGroup || !planStartDate) return null;

  if (!planEndDate) {
    return t('paymentPlans.itemWindowOpenHint', { from: formatDateFromParts(planStartDate) });
  }
  return t('paymentPlans.itemWindowHint', {
    from: formatDateFromParts(planStartDate),
    to: formatDateFromParts(planEndDate),
  });
}
