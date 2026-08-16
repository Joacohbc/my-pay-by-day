import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/contexts/AlertContext';
import type { CreatePaymentPlanDto, FinanceEvent, PaymentPlan, PaymentPlanStatus } from '@/models';
import { useCreatePaymentPlan, useUpdatePaymentPlan } from '@/hooks/usePaymentPlans';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { eventsService } from '@/services/events.service';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { EventCard } from '@/components/events/EventCard';
import { EventMultiSelectModal } from '@/components/events/EventMultiSelectModal';
import { DraftMultiSelectModal } from '@/components/events/DraftMultiSelectModal';
import { nameField, descriptionField } from '@/lib/validation';
import { findFirstFieldErrorMessage } from '@/lib/formErrors';
import { prependMissingArchived } from '@/lib/prependMissingArchived';
import { getLocalizedTodayString } from '@/lib/format';

const GROUP_PLAN_STATUSES: PaymentPlanStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED'];

function buildSchema(t: (key: string) => string) {
  return z.object({
    name: nameField(t),
    description: descriptionField(t),
    startDate: z.string().min(1, t('common.required')),
    status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED'], { error: t('common.required') }),
    categoryId: z.number().nullable(),
    tagIds: z.array(z.number()),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function toFormValues(plan?: PaymentPlan | null): FormValues {
  return {
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    startDate: plan?.startDate ?? getLocalizedTodayString(),
    status: (plan?.status as FormValues['status']) ?? 'ACTIVE',
    categoryId: plan?.category?.id ?? null,
    tagIds: plan?.tags?.map((tag) => tag.id) ?? [],
  };
}

interface GroupPlanFormProps {
  readonly editTarget?: PaymentPlan | null;
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
}

export function GroupPlanForm({ editTarget, onCancel, onSuccess }: GroupPlanFormProps) {
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

  const [selectedEvents, setSelectedEvents] = useState<FinanceEvent[]>([]);
  const [selectedDrafts, setSelectedDrafts] = useState<FinanceEvent[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

  const { data: allDrafts } = useFinanceEventDrafts();

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

  const eventIds = useMemo(() => selectedEvents.map((event) => event.id), [selectedEvents]);
  const draftIds = useMemo(
    () => selectedDrafts.map((draft) => draft.draftId).filter((id): id is number => id != null),
    [selectedDrafts]
  );
  const memberCount = eventIds.length + draftIds.length;

  const reportInvalidSubmit = (fieldErrors: FieldErrors<FormValues>) => {
    alert.error(findFirstFieldErrorMessage(fieldErrors) ?? t('common.validationError'));
  };

  const handleConfirmEvents = async (ids: Set<number>) => {
    const cache = new Map(selectedEvents.map((event) => [event.id, event]));
    const missingIds = Array.from(ids).filter((id) => !cache.has(id));
    const fetched = await Promise.all(missingIds.map((id) => eventsService.getById(id)));
    fetched.forEach((event) => cache.set(event.id, event));
    setSelectedEvents(Array.from(ids, (id) => cache.get(id)).filter((event): event is FinanceEvent => !!event));
    setIsEventModalOpen(false);
  };

  const handleConfirmDrafts = (ids: Set<number>) => {
    const cache = new Map<number, FinanceEvent>();
    for (const draft of allDrafts ?? []) {
      if (draft.draftId != null) cache.set(draft.draftId, draft);
    }
    setSelectedDrafts(Array.from(ids, (id) => cache.get(id)).filter((draft): draft is FinanceEvent => !!draft));
    setIsDraftModalOpen(false);
  };

  const removeSelectedEvent = (eventId: number) => {
    setSelectedEvents((prev) => prev.filter((event) => event.id !== eventId));
  };

  const removeSelectedDraft = (draftId: number) => {
    setSelectedDrafts((prev) => prev.filter((draft) => draft.draftId !== draftId));
  };

  const submitPlan = (values: FormValues) => {
    const dto: CreatePaymentPlanDto = {
      name: values.name,
      description: values.description || undefined,
      planType: 'GROUP',
      status: editTarget ? values.status : undefined,
      startDate: values.startDate,
      isAutomated: false,
      autoCreateDraft: false,
      generateItems: false,
      categoryId: values.categoryId ?? undefined,
      tagIds: values.tagIds,
      eventIds: eventIds.length > 0 ? eventIds : undefined,
      draftIds: draftIds.length > 0 ? draftIds : undefined,
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

      {editTarget && (
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t('paymentPlans.statusLabel')}
              options={GROUP_PLAN_STATUSES.map((status) => ({
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

      {!editTarget && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
              {t('paymentPlans.groupMembersLabel')}
            </p>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEventModalOpen(true)}>
                <span className="flex items-center gap-1 text-dn-primary">
                  <Icon name="add_circle" className="text-sm" />
                  <span className="text-xs">{t('paymentPlans.addGroupItem')}</span>
                </span>
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsDraftModalOpen(true)}>
                <span className="flex items-center gap-1 text-dn-primary">
                  <Icon name="add_circle" className="text-sm" />
                  <span className="text-xs">{t('paymentPlans.addGroupDraftItem')}</span>
                </span>
              </Button>
            </div>
          </div>

          <EventMultiSelectModal
            open={isEventModalOpen}
            onClose={() => setIsEventModalOpen(false)}
            title={t('paymentPlans.selectEventsTitle')}
            onConfirm={handleConfirmEvents}
            minSelection={0}
            initialSelectedIds={new Set(eventIds)}
          />

          <DraftMultiSelectModal
            open={isDraftModalOpen}
            onClose={() => setIsDraftModalOpen(false)}
            title={t('paymentPlans.selectDraftsTitle')}
            onConfirm={handleConfirmDrafts}
            minSelection={0}
            initialSelectedIds={new Set(draftIds)}
          />

          {memberCount > 0 ? (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <div
                  key={`event-${event.id}`}
                  className="group p-2 border border-transparent hover:border-dn-primary/50 transition-colors rounded-2xl flex items-center justify-between gap-5"
                >
                  <EventCard event={event} disableLink />
                  <button
                    type="button"
                    onClick={() => removeSelectedEvent(event.id)}
                    className="shrink-0 flex items-center justify-center rounded-full p-2 text-dn-error hover:bg-dn-error/10 transition-colors"
                    title={t('paymentPlans.removeGroupMember')}
                  >
                    <Icon name="close" className="text-xl" />
                  </button>
                </div>
              ))}
              {selectedDrafts.map((draft) => (
                <div
                  key={`draft-${draft.draftId}`}
                  className="group p-2 border border-transparent hover:border-dn-primary/50 transition-colors rounded-2xl flex items-center justify-between gap-5"
                >
                  <EventCard event={draft} disableLink />
                  <button
                    type="button"
                    onClick={() => draft.draftId != null && removeSelectedDraft(draft.draftId)}
                    className="shrink-0 flex items-center justify-center rounded-full p-2 text-dn-error hover:bg-dn-error/10 transition-colors"
                    title={t('paymentPlans.removeGroupMember')}
                  >
                    <Icon name="close" className="text-xl" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-dn-text-muted leading-relaxed px-1">
                {t('paymentPlans.groupMembersCount', { count: memberCount })}
              </p>
            </div>
          ) : (
            <EmptyState title={t('paymentPlans.noGroupMembers')} description={t('paymentPlans.groupHint')} />
          )}
        </div>
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
