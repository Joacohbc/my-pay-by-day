import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePaymentPlan, usePaymentPlans, useCancelPaymentPlan, useUpdatePaymentPlan } from '@/hooks/usePaymentPlans';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes, draftRoute } from '@/lib/routes';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PaymentPlanItemForm } from '@/components/paymentPlans/PaymentPlanItemForm';
import { itemStatusVariants } from '@/components/paymentPlans/itemStatusVariants';
import { PageHeader } from '@/components/ui/PageHeader';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatCurrency, formatDateFromParts } from '@/lib/format';
import type { FinanceEvent, PaymentPlan, PaymentPlanItem, PaymentPlanStatus } from '@/models';

const statusBadgeVariants: Record<PaymentPlanStatus, 'income' | 'indigo' | 'gray'> = {
  ACTIVE: 'income',
  COMPLETED: 'indigo',
  PAUSED: 'gray',
  CANCELLED: 'gray',
};

const statusIcons: Record<PaymentPlanStatus, string> = {
  ACTIVE: 'check_circle',
  COMPLETED: 'task_alt',
  PAUSED: 'pause_circle',
  CANCELLED: 'cancel',
};

export function PaymentPlanDetailPage() {
  const { t } = useTranslation();
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const { navigate, navigateBack, linkStateFromHere } = useAppNavigation();
  const goBack = () => navigateBack(Routes.PAYMENT_PLANS);

  const { data: plans = [] } = usePaymentPlans();
  const { data: singlePlan, isLoading: isDetailLoading } = usePaymentPlan(Number(id));
  const plan = singlePlan ?? plans.find((candidate) => candidate.id === Number(id));

  const { data: drafts = [] } = useFinanceEventDrafts();
  const draftsByDraftId = useMemo(
    () => new Map(drafts.filter((draft) => draft.draftId != null).map((draft) => [draft.draftId as number, draft])),
    [drafts]
  );

  const cancelPlan = useCancelPaymentPlan();
  const updatePlan = useUpdatePaymentPlan();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (isDetailLoading && !plan) return <FullPageSpinner />;
  if (!plan) return <ErrorState message={t('paymentPlans.noPlans')} />;

  const isInstallment = plan.planType === 'INSTALLMENT';
  const isActive = plan.status === 'ACTIVE';

  const confirmCancel = async () => {
    await cancelPlan.mutateAsync(plan.id);
    setIsConfirmOpen(false);
    goBack();
  };

  const toggleStatus = () =>
    updatePlan.mutate({
      id: plan.id,
      dto: { ...plan, status: isActive ? 'PAUSED' : 'ACTIVE' },
    });

  const toggleAutomation = () =>
    updatePlan.mutate({
      id: plan.id,
      dto: { ...plan, isAutomated: !plan.isAutomated },
    });

  const closeItemModal = () => navigate(Routes.PAYMENT_PLAN_DETAIL(plan.id));
  const editedItem = plan.items?.find((item) => String(item.id) === itemId);
  const nextInstallmentNumber = (plan.items ?? []).reduce((max, item) => Math.max(max, item.installmentNumber), 0) + 1;

  return (
    <div className="space-y-5">
      <ConfirmModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmCancel}
        title={t('paymentPlans.cancelPlan')}
        message={t('paymentPlans.cancelConfirm')}
        confirmLabel={t('paymentPlans.cancelPlan')}
        variant="danger"
        loading={cancelPlan.isPending}
      />

      <Modal
        open={!!itemId}
        onClose={closeItemModal}
        title={editedItem ? t('paymentPlans.itemEditTitle') : t('paymentPlans.itemNewTitle')}
      >
        <PaymentPlanItemForm
          key={itemId}
          planId={plan.id}
          editTarget={editedItem}
          nextInstallmentNumber={nextInstallmentNumber}
          defaultAmount={plan.installmentAmount}
          onCancel={closeItemModal}
          onSuccess={closeItemModal}
        />
      </Modal>

      <PageHeader
        title={t('paymentPlans.viewDetailTitle')}
        back={goBack}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              title={isActive ? t('common.pause') : t('paymentPlans.activate')}
              onClick={toggleStatus}
              loading={updatePlan.isPending}
            >
              <Icon name={isActive ? 'pause' : 'play_arrow'} className="text-base" />
            </Button>
            <Link to={Routes.PAYMENT_PLAN_EDIT(plan.id)} state={linkStateFromHere()}>
              <Button variant="secondary" size="sm" title={t('common.edit')}>
                <Icon name="edit" className="text-base" />
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              title={t('paymentPlans.cancelPlan')}
              onClick={() => setIsConfirmOpen(true)}
            >
              <Icon name="delete" className="text-base" />
            </Button>
          </div>
        }
      />

      <div className="px-5 flex flex-col items-center text-center">
        {plan.category ? (
          <CategoryIcon category={plan.category} size="lg" shape="rounded-full" className="w-16 h-16 text-3xl mb-4" />
        ) : (
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-dn-primary/10 text-dn-primary mb-4">
            <Icon name={isInstallment ? 'credit_card' : 'sync'} className="text-3xl" />
          </div>
        )}

        <h2 className="text-xl font-semibold text-dn-text-main tracking-tight">{plan.name}</h2>
        {plan.description && <p className="text-sm text-dn-text-muted mt-1">{plan.description}</p>}

        <p className="text-4xl font-mono font-bold tracking-tight mt-3 text-dn-primary break-all">
          {plan.installmentAmount ? formatCurrency(plan.installmentAmount) : '—'}
        </p>
        <p className="text-xs text-dn-text-muted mt-1">
          {t('paymentPlans.cycleAmount')} · {t(`subscriptions.recurrence.${plan.frequency}`)}
        </p>

        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <Badge variant={statusBadgeVariants[plan.status]} className="gap-1">
            <Icon name={statusIcons[plan.status]} className="text-[13px]" />
            {t(`paymentPlans.status.${plan.status}`)}
          </Badge>
          <button
            type="button"
            onClick={toggleAutomation}
            disabled={updatePlan.isPending}
            title={plan.isAutomated ? t('paymentPlans.switchToManual') : t('paymentPlans.switchToAutomated')}
            className="rounded-pill transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <Badge variant="neutral" className="gap-1">
              <Icon name={plan.isAutomated ? 'smart_toy' : 'touch_app'} className="text-[13px]" />
              {plan.isAutomated ? t('paymentPlans.automated') : t('paymentPlans.manual')}
              <Icon name="swap_horiz" className="text-[13px] text-dn-text-muted" />
            </Badge>
          </button>
          <Badge>{t(`paymentPlans.types.${plan.planType}`)}</Badge>
          {plan.tags?.map((tag) => (
            <Badge key={tag.id} variant="indigo">#{tag.name}</Badge>
          ))}
        </div>
      </div>

      {isInstallment && !!plan.totalInstallments && <InstallmentProgress plan={plan} />}

      <div className="px-5">
        <Card className="divide-y divide-white/5">
          <DetailRow label={t('paymentPlans.startDateLabel')} value={formatDateFromParts(plan.startDate)} isMono />
          {plan.nextDueDate && (
            <DetailRow label={t('paymentPlans.nextDueDateLabel')} value={formatDateFromParts(plan.nextDueDate)} isMono />
          )}
          {plan.totalAmount != null && (
            <DetailRow label={t('paymentPlans.totalAmountLabel')} value={formatCurrency(plan.totalAmount)} isMono />
          )}
          {plan.category && (
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-dn-text-muted">{t('common.category')}</span>
              <div className="flex items-center gap-2">
                <CategoryIcon category={plan.category} size="sm" />
                <span className="text-sm text-dn-text-main">{plan.category.name}</span>
              </div>
            </div>
          )}
          {(plan.originNode || plan.destinationNode) && (
            <DetailRow
              label={t('paymentPlans.nodesLabel')}
              value={`${plan.originNode?.name ?? t('common.none')} → ${plan.destinationNode?.name ?? t('common.none')}`}
            />
          )}
        </Card>
      </div>

      <div className="px-5 pb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
            {t('paymentPlans.itemsList')}
          </h3>
          <Link to={Routes.PAYMENT_PLAN_ITEM_NEW(plan.id)} state={linkStateFromHere()}>
            <Button size="sm" variant="secondary">
              <Icon name="add" className="text-sm" />
              {t('paymentPlans.addItem')}
            </Button>
          </Link>
        </div>

        {plan.items?.length ? (
          <Card className="divide-y divide-white/5">
            {plan.items.map((item) => (
              <PaymentPlanItemRow key={item.id} item={item} draft={draftsByDraftId.get(item.draftId ?? -1)} />
            ))}
          </Card>
        ) : (
          <EmptyState
            title={t('paymentPlans.noItems')}
            action={
              <Link to={Routes.PAYMENT_PLAN_ITEM_NEW(plan.id)} state={linkStateFromHere()}>
                <Button size="sm">
                  <Icon name="add" className="text-sm" />
                  {t('paymentPlans.addItem')}
                </Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, isMono }: { readonly label: string; readonly value: string; readonly isMono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-dn-text-muted shrink-0">{label}</span>
      <span className={`text-sm text-dn-text-main text-right truncate ${isMono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function InstallmentProgress({ plan }: { readonly plan: PaymentPlan }) {
  const { t } = useTranslation();
  const totalInstallments = plan.totalInstallments ?? 0;
  const progressPercent =
    totalInstallments > 0 ? Math.min(100, Math.round((plan.completedInstallments / totalInstallments) * 100)) : 0;

  return (
    <div className="px-5">
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-dn-text-muted uppercase tracking-wider">{t('paymentPlans.cuotasLabel')}</p>
          <p className="text-sm font-mono text-dn-text-main">
            {plan.completedInstallments} / {totalInstallments}
          </p>
        </div>
        <div className="h-2 rounded-full bg-dn-surface-low overflow-hidden">
          <div className="h-full rounded-full bg-dn-primary transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-xs text-dn-text-muted">
          {t('paymentPlans.remainingLabel')}:{' '}
          <span className="font-mono text-dn-primary">{formatCurrency(plan.remainingAmount)}</span>
        </p>
      </Card>
    </div>
  );
}

function PaymentPlanItemRow({ item, draft }: { readonly item: PaymentPlanItem; readonly draft?: FinanceEvent }) {
  const { t } = useTranslation();
  const { linkStateFromHere } = useAppNavigation();

  function buildLinkedTarget() {
    if (item.eventId) {
      return {
        route: Routes.EVENT_DETAIL(item.eventId),
        state: undefined,
        icon: 'receipt_long',
        label: t('paymentPlans.viewEvent'),
      };
    }
    if (!item.draftId) return null;
    return {
      route: draft ? draftRoute(draft) : Routes.EVENT_DRAFTS,
      state: draft ? { draft } : undefined,
      icon: 'edit_note',
      label: t('paymentPlans.viewDraft'),
    };
  }

  const linkedTarget = buildLinkedTarget();

  const trailing = linkedTarget ? (
    <Link
      to={linkedTarget.route}
      state={linkStateFromHere(linkedTarget.state)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium text-dn-primary bg-dn-primary/10 hover:bg-dn-primary/20 transition-colors"
    >
      <Icon name={linkedTarget.icon} className="text-sm" />
      {linkedTarget.label}
    </Link>
  ) : (
    <Badge variant={itemStatusVariants[item.itemStatus]}>{t(`paymentPlans.itemStatus.${item.itemStatus}`)}</Badge>
  );

  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <Link
        to={Routes.PAYMENT_PLAN_ITEM_EDIT(item.paymentPlanId, item.id)}
        state={linkStateFromHere()}
        className="flex items-center gap-3 min-w-0 flex-1"
      >
        <span className="w-8 h-8 shrink-0 rounded-full bg-dn-surface-low text-dn-text-muted flex items-center justify-center text-xs font-mono">
          {item.installmentNumber}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm text-dn-text-main font-mono">{formatDateFromParts(item.expectedDate)}</span>
          {item.expectedAmount != null && (
            <span className="text-xs text-dn-text-muted font-mono">{formatCurrency(item.expectedAmount)}</span>
          )}
        </div>
      </Link>
      <div className="shrink-0">{trailing}</div>
    </div>
  );
}
