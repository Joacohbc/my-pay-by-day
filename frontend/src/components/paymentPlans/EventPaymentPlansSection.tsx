import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { CreatePaymentPlanItemDto, FinanceEvent, PaymentPlan, PaymentPlanItem } from '@/models';
import { usePaymentPlans, useUpdatePaymentPlanItem } from '@/hooks/usePaymentPlans';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { formatDateFromParts } from '@/lib/format';
import { itemNumberKey, itemStatusVariants, planTypeIcons } from '@/components/paymentPlans/planPresentation';
import { AssignEventToPlanModal } from '@/components/paymentPlans/AssignEventToPlanModal';

interface PlanAssignment {
  readonly plan: PaymentPlan;
  readonly item: PaymentPlanItem;
}

export function EventPaymentPlansSection({ event }: { readonly event: FinanceEvent }) {
  const { t } = useTranslation();
  const { data: plans = [] } = usePaymentPlans();
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const assignments = useMemo<PlanAssignment[]>(
    () =>
      plans.flatMap((plan) =>
        (plan.items ?? []).filter((item) => item.eventId === event.id).map((item) => ({ plan, item }))
      ),
    [plans, event.id]
  );

  return (
    <div className="px-5 mt-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
          {t('paymentPlans.eventSectionTitle')}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setIsAssignOpen(true)}>
          <span className="flex items-center gap-1 text-dn-primary">
            <Icon name="add" className="text-sm" />
            <span className="text-xs">{t('paymentPlans.assignEvent')}</span>
          </span>
        </Button>
      </div>

      <AssignEventToPlanModal open={isAssignOpen} onClose={() => setIsAssignOpen(false)} event={event} />

      {assignments.length ? (
        <Card className="divide-y divide-white/5">
          {assignments.map(({ plan, item }) => (
            <AssignedPlanRow key={item.id} plan={plan} item={item} />
          ))}
        </Card>
      ) : (
        <EmptyState title={t('paymentPlans.noAssignments')} />
      )}
    </div>
  );
}

function AssignedPlanRow({ plan, item }: PlanAssignment) {
  const { t } = useTranslation();
  const { linkStateFromHere } = useAppNavigation();
  const updateItem = useUpdatePaymentPlanItem(plan.id);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const confirmUnassign = async () => {
    const dto: CreatePaymentPlanItemDto = {
      installmentNumber: item.installmentNumber,
      expectedDate: item.expectedDate,
      expectedAmount: item.expectedAmount,
      itemStatus: 'PENDING',
    };
    await updateItem.mutateAsync({ itemId: item.id, dto });
    setIsConfirmOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <ConfirmModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmUnassign}
        title={t('paymentPlans.unassign')}
        message={t('paymentPlans.unassignConfirm')}
        confirmLabel={t('paymentPlans.unassign')}
        variant="danger"
        loading={updateItem.isPending}
      />

      <Link
        to={Routes.PAYMENT_PLAN_ITEM_EDIT(plan.id, item.id)}
        state={linkStateFromHere()}
        className="flex items-center gap-3 min-w-0 flex-1"
      >
        <span className="w-8 h-8 shrink-0 rounded-full bg-dn-primary/10 text-dn-primary flex items-center justify-center">
          <Icon name={planTypeIcons[plan.planType]} className="text-base" />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm text-dn-text-main truncate">{plan.name}</span>
          <span className="text-xs text-dn-text-muted font-mono truncate">
            {t(itemNumberKey(plan.planType), { number: item.installmentNumber })}
            {' · '}
            {formatDateFromParts(item.expectedDate)}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={itemStatusVariants[item.itemStatus]}>
          {t(`paymentPlans.itemStatus.${item.itemStatus}`)}
        </Badge>
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          title={t('paymentPlans.unassign')}
          className="flex items-center justify-center rounded-full p-2 text-dn-error hover:bg-dn-error/10 transition-colors"
        >
          <Icon name="link_off" className="text-lg" />
        </button>
      </div>
    </div>
  );
}
