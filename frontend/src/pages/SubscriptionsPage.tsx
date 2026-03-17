import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, useWatch } from 'react-hook-form';
import {
  useSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
} from '@/hooks/useSubscriptions';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { formatDateFromParts, truncate } from '@/lib/format';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Pagination } from '@/components/ui/Pagination';
import type { Subscription, EventType, ModifierType, RecurrenceFrequency, SubscriptionStatus } from '@/models';

const EVENT_TYPE_LABELS: Record<string, string> = {
  INBOUND: 'Income',
  OUTBOUND: 'Expense',
  OTHER: 'Transfer',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  INBOUND: 'text-dn-success bg-dn-success/10',
  OUTBOUND: 'text-dn-error bg-dn-error/10',
  OTHER: 'text-dn-text-muted bg-dn-surface-low',
};

interface FormValues {
  name: string;
  description: string;
  eventType: string;
  originNodeId: string;
  destinationNodeId: string;
  categoryId: string;
  tagIds: string[];
  modifierType: string;
  modifierValue: string;
  recurrence: string;
  nextExecutionDate: string;
  status: string;
}

const DEFAULT_FORM: FormValues = {
  name: '',
  description: '',
  eventType: '',
  originNodeId: '',
  destinationNodeId: '',
  categoryId: '',
  tagIds: [],
  modifierType: '',
  modifierValue: '',
  recurrence: 'MONTHLY',
  nextExecutionDate: new Date().toISOString().split('T')[0],
  status: 'ACTIVE',
};

function SubscriptionCard({
  sub,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  sub: Subscription;
  onEdit: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => void;
  onToggleStatus: (sub: Subscription) => void;
}) {
  const { t } = useTranslation();
  const nextDate = formatDateFromParts(sub.nextExecutionDate.slice(0, 10));

  const isActive = sub.status === 'ACTIVE';

  return (
    <Card className={`flex items-start gap-4 transition-opacity ${isActive ? '' : 'opacity-60 grayscale'}`}>
      <div className={`w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 mt-0.5 ${isActive ? 'bg-dn-primary/10 text-dn-primary' : 'bg-dn-surface-low text-dn-text-muted'}`}>
        <Icon name="sync" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-medium text-dn-text-main truncate">{truncate(sub.name, 40)}</p>
          {sub.eventType && (
            <span
              className={`text-xs px-2 py-0.5 rounded-pill font-medium ${EVENT_TYPE_COLORS[sub.eventType] ?? 'text-dn-text-muted bg-dn-surface-low'}`}
            >
              {EVENT_TYPE_LABELS[sub.eventType]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={isActive ? 'indigo' : 'gray'}>{t(`subscriptions.recurrence.${sub.recurrence}`)}</Badge>
          <span className="text-xs text-dn-text-muted flex items-center gap-1">
            <Icon name="calendar_today" className="text-xs" />
            {t('subscriptions.next')}: {nextDate}
          </span>
          <Badge variant={isActive ? 'income' : 'expense'}>{t(`subscriptions.status.${sub.status}`)}</Badge>
        </div>

        {(sub.originNodeName || sub.destinationNodeName) && (
          <p className="text-xs text-dn-text-muted mt-2">
            {sub.originNodeName}
            {sub.destinationNodeName && <span> → {sub.destinationNodeName}</span>}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {sub.category && (
            <div className="flex items-center gap-1.5">
              <CategoryIcon category={sub.category} size="sm" />
              <span className="text-xs text-dn-text-muted">{sub.category.name}</span>
            </div>
          )}
          {sub.tags &&
            sub.tags.map((tag) => (
              <span key={tag.id} className="text-xs text-dn-text-muted/70">
                #{tag.name}
              </span>
            ))}
          {sub.modifierType && sub.modifierValue !== undefined && (
            <span className="text-xs font-semibold text-dn-primary/80">
              {sub.modifierType === 'PERCENTAGE'
                ? `${sub.modifierValue}% modifier`
                : `$${sub.modifierValue}`}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 shrink-0">
        <button
          title={isActive ? t('common.archive') : t('common.active')}
          onClick={() => onToggleStatus(sub)}
          className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
        >
          <Icon name={isActive ? 'pause' : 'play_arrow'} className="text-base" />
        </button>
        <button
          onClick={() => onEdit(sub)}
          className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
        >
          <Icon name="edit" className="text-base" />
        </button>
        <button
          onClick={() => onDelete(sub)}
          className="p-2 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors"
        >
          <Icon name="delete" className="text-base" />
        </button>
      </div>
    </Card>
  );
}

export function SubscriptionsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const { data: paged, isLoading, error } = useSubscriptions(page);
  const { data: categoriesPaged } = useCategories(0, 200);
  const { data: tagsPaged } = useTags(0, 200);
  const { data: nodesPaged } = useNodes(0, 200);

  const categories = categoriesPaged?.content ?? [];
  const tags = tagsPaged?.content ?? [];
  const nodes = nodesPaged?.content ?? [];
  const activeNodes = nodes.filter((n) => !n.archived);

  const createSub = useCreateSubscription();
  const updateSub = useUpdateSubscription();
  const deleteSub = useDeleteSubscription();

  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_FORM });

  const watchModifierType = useWatch({ control, name: 'modifierType' });

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allSubs = paged?.content ?? [];
  const totalPages = paged?.totalPages ?? 1;

  const openCreate = () => {
    setEditTarget(null);
    reset(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditTarget(sub);
    reset({
      name: sub.name,
      description: sub.description ?? '',
      eventType: sub.eventType ?? '',
      originNodeId: sub.originNodeId ? String(sub.originNodeId) : '',
      destinationNodeId: sub.destinationNodeId ? String(sub.destinationNodeId) : '',
      categoryId: sub.category ? String(sub.category.id) : '',
      tagIds: sub.tags ? sub.tags.map((tag) => String(tag.id)) : [],
      modifierType: sub.modifierType ?? '',
      modifierValue: sub.modifierValue !== undefined ? String(sub.modifierValue) : '',
      recurrence: sub.recurrence,
      nextExecutionDate: sub.nextExecutionDate.slice(0, 10),
      status: sub.status,
    });
    setShowModal(true);
  };

  const onSubmit = async (values: FormValues) => {
    const dto = {
      name: values.name,
      description: values.description || undefined,
      originNodeId: values.originNodeId ? Number(values.originNodeId) : undefined,
      destinationNodeId: values.destinationNodeId ? Number(values.destinationNodeId) : undefined,
      category: values.categoryId ? { id: Number(values.categoryId) } : undefined,
      tags: values.tagIds.map((id) => ({ id: Number(id) })),
      eventType: (values.eventType as EventType) || undefined,
      modifierType: (values.modifierType as ModifierType) || undefined,
      modifierValue: values.modifierType && values.modifierValue ? Number(values.modifierValue) : undefined,
      recurrence: values.recurrence as RecurrenceFrequency,
      nextExecutionDate: values.nextExecutionDate,
      status: values.status as SubscriptionStatus,
    };

    if (editTarget) {
      await updateSub.mutateAsync({ id: editTarget.id, dto });
    } else {
      await createSub.mutateAsync(dto);
    }
    reset(DEFAULT_FORM);
    setShowModal(false);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return;
    await deleteSub.mutateAsync(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const handleToggleStatus = async (sub: Subscription) => {
    const newStatus = sub.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE';
    await updateSub.mutateAsync({
      id: sub.id,
      dto: { status: newStatus },
    });
  };

  const isSubmitting = createSub.isPending || updateSub.isPending;
  const nodeOptions = activeNodes.map((n) => ({ value: String(n.id), label: n.name }));

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={t('subscriptions.deleteConfirm', 'Delete this subscription?')}
        confirmLabel={t('common.delete')}
        loading={deleteSub.isPending}
      />

      <PageHeader
        title={t('subscriptions.title')}
        subtitle={t('subscriptions.subtitle')}
        action={
          <Button size="sm" onClick={openCreate}>
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </Button>
        }
      />

      <div className="px-5">
        <Card>
          <div className="flex items-start gap-3">
            <Icon name="sync" className="text-dn-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-dn-text-main">{t('subscriptions.howItWorks')}</p>
              <p className="text-xs text-dn-text-muted mt-1 leading-relaxed">
                {t('subscriptions.howItWorksDesc')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {allSubs.length === 0 ? (
        <EmptyState
          icon={<Icon name="sync" className="text-2xl" />}
          title={t('subscriptions.noSubs')}
          description={t('subscriptions.noSubsDesc')}
          action={
            <Button size="sm" onClick={openCreate}>
              <Icon name="add" className="text-sm" />
              {t('subscriptions.addSubscription')}
            </Button>
          }
        />
      ) : (
        <div className="px-5 space-y-3">
          {allSubs.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              onEdit={openEdit}
              onDelete={(s) => setConfirmDeleteId(s.id)}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          reset(DEFAULT_FORM);
        }}
        title={editTarget ? t('subscriptions.editSubscription', 'Edit Subscription') : t('subscriptions.createSubscription')}
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editTarget ? t('common.update') : t('common.create')}
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label={t('common.name')}
            placeholder={t('templates.namePlaceholder')}
            error={errors.name?.message}
            {...register('name', { required: t('common.nameRequired') })}
          />

          <Textarea
            label={t('common.description')}
            placeholder={t('templates.descriptionPlaceholder')}
            {...register('description')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="recurrence"
              control={control}
              rules={{ required: t('common.required') }}
              render={({ field }) => (
                <SearchableSelect
                  label={t('subscriptions.recurrenceLabel', 'Recurrence')}
                  placeholder={t('common.none')}
                  options={[
                    { value: 'DAILY', label: t('subscriptions.recurrence.DAILY') },
                    { value: 'WEEKLY', label: t('subscriptions.recurrence.WEEKLY') },
                    { value: 'MONTHLY', label: t('subscriptions.recurrence.MONTHLY') },
                    { value: 'YEARLY', label: t('subscriptions.recurrence.YEARLY') },
                  ]}
                  {...field}
                />
              )}
            />
            <Input
              label={t('subscriptions.next', 'Next Execution')}
              type="date"
              error={errors.nextExecutionDate?.message}
              {...register('nextExecutionDate', { required: t('common.required') })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="status"
              control={control}
              rules={{ required: t('common.required') }}
              render={({ field }) => (
                <SearchableSelect
                  label={t('common.status', 'Status')}
                  options={[
                    { value: 'ACTIVE', label: t('subscriptions.status.ACTIVE', 'Active') },
                    { value: 'CANCELLED', label: t('subscriptions.status.CANCELLED', 'Cancelled') },
                  ]}
                  {...field}
                />
              )}
            />
            <Controller
              name="eventType"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label={t('templates.eventType')}
                  placeholder={t('common.none')}
                  options={[
                    { value: 'INBOUND', label: t('eventType.INBOUND') },
                    { value: 'OUTBOUND', label: t('eventType.OUTBOUND') },
                    { value: 'OTHER', label: t('eventType.OTHER') },
                  ]}
                  {...field}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="originNodeId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label={t('templates.originNode')}
                  placeholder={t('common.none')}
                  options={nodeOptions}
                  {...field}
                />
              )}
            />
            <Controller
              name="destinationNodeId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label={t('templates.destinationNode')}
                  placeholder={t('common.none')}
                  options={nodeOptions}
                  {...field}
                />
              )}
            />
          </div>

          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label={t('eventForm.category')}
                placeholder={t('common.none')}
                options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                {...field}
              />
            )}
          />

          {tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">
                {t('eventForm.tags')}
              </p>
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

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="modifierType"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label={t('templates.modifierType')}
                  placeholder={t('common.none')}
                  options={[
                    { value: 'PERCENTAGE', label: t('templates.percentage') },
                    { value: 'FIXED', label: t('templates.fixed') },
                  ]}
                  {...field}
                />
              )}
            />
            {watchModifierType && (
              <Input
                label={t('templates.modifierValue')}
                placeholder={watchModifierType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 5.00'}
                type="number"
                step="0.01"
                min="0"
                {...register('modifierValue')}
              />
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
