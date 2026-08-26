import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent, PaymentPlan, PaymentPlanItem } from '@/models';
import { useAttachToPaymentPlan, usePaymentPlans } from '@/hooks/usePaymentPlans';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatDateFromParts } from '@/lib/format';
import { isGroupPlan, itemNumberKey } from '@/components/paymentPlans/planPresentation';

function isAssignable(plan: PaymentPlan): boolean {
  return plan.status !== 'CANCELLED';
}

function hasNoLinkedEvent(item: PaymentPlanItem): boolean {
  return item.eventId == null;
}

/** An installment plan is finite, so a full one can only take the event into a cuota already there. */
function canOpenNewItem(plan: PaymentPlan): boolean {
  if (plan.planType !== 'INSTALLMENT') return true;
  return (plan.items ?? []).length < (plan.totalInstallments ?? 0);
}

function firstFreeItemValueOf(plan?: PaymentPlan): string {
  const firstFreeItem = (plan?.items ?? []).find(hasNoLinkedEvent);
  return firstFreeItem ? String(firstFreeItem.id) : '';
}

interface AssignEventToPlanModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly event: FinanceEvent;
}

export function AssignEventToPlanModal({ open, onClose, event }: AssignEventToPlanModalProps) {
  const { t } = useTranslation();
  const { data: plans = [] } = usePaymentPlans();
  const attachToPlan = useAttachToPaymentPlan();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItemValue, setSelectedItemValue] = useState('');

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const planOptions = useMemo(
    () =>
      plans.filter(isAssignable).map((plan) => ({
        value: String(plan.id),
        label: `${plan.name} · ${t(`paymentPlans.types.${plan.planType}`)}`,
      })),
    [plans, t]
  );

  const freeItems = useMemo(() => (selectedPlan?.items ?? []).filter(hasNoLinkedEvent), [selectedPlan]);

  const itemOptions = useMemo(() => {
    if (!selectedPlan) return [];

    return freeItems.map((item) => ({
      value: String(item.id),
      label: `${t(itemNumberKey(selectedPlan.planType), { number: item.installmentNumber })} · ${formatDateFromParts(item.expectedDate)}`,
    }));
  }, [freeItems, selectedPlan, t]);

  const canAssign = selectedPlan != null && (freeItems.length > 0 || canOpenNewItem(selectedPlan));

  const closeAndReset = () => {
    setSelectedPlanId(null);
    setSelectedItemValue('');
    onClose();
  };

  const selectPlan = (value: string | number | null) => {
    const nextPlan = value ? plans.find((plan) => plan.id === Number(value)) : undefined;
    setSelectedPlanId(nextPlan?.id ?? null);
    setSelectedItemValue(firstFreeItemValueOf(nextPlan));
  };

  /**
   * Nothing here resolves which entry the event lands in: with no cuota chosen the backend claims
   * the first free one — or opens a new one — inside the same transaction that links the event.
   */
  const assign = () => {
    if (!selectedPlan) return;

    attachToPlan.mutate(
      {
        planId: selectedPlan.id,
        dto: { eventIds: [event.id], itemId: selectedItemValue ? Number(selectedItemValue) : undefined },
      },
      { onSuccess: closeAndReset }
    );
  };

  const assignmentHint = () => {
    if (!selectedPlan || freeItems.length > 0) return t('paymentPlans.assignHint');
    if (!canOpenNewItem(selectedPlan)) return t('paymentPlans.assignNoFreeItems');
    return isGroupPlan(selectedPlan.planType) ? t('paymentPlans.assignNewGroupItem') : t('paymentPlans.assignNewItem');
  };

  return (
    <Modal
      open={open}
      onClose={closeAndReset}
      title={t('paymentPlans.assignTitle')}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={closeAndReset}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            loading={attachToPlan.isPending}
            disabled={!canAssign}
            onClick={assign}
          >
            {t('paymentPlans.assignSubmit')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SearchableSelect
          label={t('paymentPlans.assignPlanLabel')}
          placeholder={t('common.select')}
          options={planOptions}
          value={selectedPlanId == null ? '' : String(selectedPlanId)}
          onChange={selectPlan}
        />

        {selectedPlan && itemOptions.length > 0 && (
          <SearchableSelect
            label={
              isGroupPlan(selectedPlan.planType)
                ? t('paymentPlans.assignGroupItemLabel')
                : t('paymentPlans.assignItemLabel')
            }
            options={itemOptions}
            value={selectedItemValue}
            onChange={(value) => setSelectedItemValue(value ? String(value) : '')}
          />
        )}

        <p className="text-xs text-dn-text-muted leading-relaxed">{assignmentHint()}</p>
      </div>
    </Modal>
  );
}
