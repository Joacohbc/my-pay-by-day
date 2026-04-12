import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
} from '@/hooks/useSubscriptions';
import { formatCurrency, formatDateFromParts } from '@/lib/format';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Pagination } from '@/components/ui/Pagination';
import type { Subscription, CreateSubscriptionDto } from '@/models';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';

// EVENT_TYPE_COLORS provides the tailwind classes for each event type
const EVENT_TYPE_COLORS: Record<string, string> = {
  INBOUND: 'text-dn-success bg-dn-success/10',
  OUTBOUND: 'text-dn-error bg-dn-error/10',
  OTHER: 'text-dn-text-muted bg-dn-surface-low',
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
    <Card className={`flex p-0 overflow-hidden transition-opacity ${isActive ? '' : 'opacity-60 grayscale'}`}>
      <div className="flex-1 min-w-0 p-3 lg:p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="sync" className="text-2xl text-dn-text-muted" />
            <h2 className="text-lg font-bold text-dn-text-main truncate">{sub.name}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {sub.eventType && (
              <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_COLORS[sub.eventType] ?? 'text-dn-text-muted bg-dn-surface-low'}`}>
                <Icon name={sub.eventType === 'OUTBOUND' ? 'upload' : sub.eventType === 'INBOUND' ? 'download' : 'sync_alt'} className="text-[13px]" />
                {t(`eventType.${sub.eventType}`)}
              </span>
            )}

            {isActive ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-dn-success bg-dn-success/10 border border-dn-success/20">
                <Icon name="check_circle" className="text-[13px]" /> {t(`subscriptions.status.${sub.status}`)}
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-dn-text-muted bg-dn-surface-low border border-dn-border/50">
                <Icon name="pause_circle" className="text-[13px]" /> {t(`subscriptions.status.${sub.status}`)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Details */}
          <div className="flex flex-col gap-3 min-w-0">
            <h3 className="text-xs font-bold text-dn-text-main uppercase tracking-wider">{t('subscriptions.expenseDetails')}</h3>

            {sub.category && (
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 flex items-center justify-center text-dn-text-muted">
                  <CategoryIcon category={sub.category} size="md" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-medium text-dn-text-main">{sub.category.name}</span>
                </div>
              </div>
            )}

            {(sub.originNodeName || sub.destinationNodeName) && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Icon name="account_balance" className="text-[22px] text-dn-text-muted" />
                </div>
                <span className="text-[13px] text-dn-text-main">
                  {sub.eventType === 'INBOUND' ? sub.destinationNodeName : sub.originNodeName}
                </span>
              </div>
            )}

            {sub.tags && sub.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {sub.tags.map((tag) => (
                  <span key={tag.id} className="text-xs font-medium text-dn-text-muted bg-transparent border border-dn-border/60 px-2 py-0.5 rounded-md">
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-3 min-w-0">
            <h3 className="text-xs font-bold text-dn-text-main uppercase tracking-wider">{t('subscriptions.amountToPay')}</h3>

            {sub.modifierValue != null && (
              <div className="text-xl font-bold text-[#e1a5e3] tracking-tight break-all">
                {formatCurrency(sub.modifierValue)}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-xs text-dn-text-muted">
                {t('subscriptions.frequency')}: {t(`subscriptions.recurrence.${sub.recurrence}`)}
              </span>
              <span className="text-xs text-dn-text-muted">
                {t('subscriptions.nextPayment')}: {nextDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-12 flex flex-col items-center justify-center gap-2 p-2 shrink-0">
        <button
          title={isActive ? t('common.archive') : t('common.active')}
          onClick={() => onToggleStatus(sub)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
        >
          <Icon name={isActive ? 'pause' : 'play_arrow'} className="text-lg" />
        </button>
        <button
          onClick={() => onEdit(sub)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
        >
          <Icon name="edit" className="text-lg" />
        </button>
        <button
          onClick={() => onDelete(sub)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-dn-error/70 hover:text-dn-error hover:bg-dn-error/10 border border-transparent transition-colors"
        >
          <Icon name="delete" className="text-lg" />
        </button>
      </div>
    </Card>
  );
}

export function SubscriptionsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const { data: paged, isLoading, error } = useSubscriptions(page);

  const createSub = useCreateSubscription();
  const updateSub = useUpdateSubscription();
  const deleteSub = useDeleteSubscription();

  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allSubs = paged?.content ?? [];
  const totalPages = paged?.totalPages ?? 1;

  const openCreate = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditTarget(sub);
    setShowModal(true);
  };

  const handleSubmit = async (dto: CreateSubscriptionDto) => {
    if (editTarget) {
      await updateSub.mutateAsync({ id: editTarget.id, dto });
    } else {
      await createSub.mutateAsync(dto);
    }
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

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={t('subscriptions.deleteConfirm')}
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
        onClose={() => setShowModal(false)}
        title={editTarget ? t('subscriptions.editSubscription') : t('subscriptions.createSubscription')}
      >
        <SubscriptionForm
          editTarget={editTarget}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
          loading={isSubmitting}
        />
      </Modal>
    </div>
  );
}
