import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreatePaymentPlanItemDto, FinanceEvent, PaymentPlan, PaymentPlanItem } from '@/models';
import { useCreatePaymentPlanItem, usePaymentPlans, useUpdatePaymentPlanItem } from '@/hooks/usePaymentPlans';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatDateFromParts, getLocalizedTodayString } from '@/lib/format';
import { isGroupPlan, itemNumberKey } from '@/components/paymentPlans/planPresentation';

const NEW_ITEM_VALUE = 'NEW';
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;

function toDateOnly(localDateTime?: string): string {
  return localDateTime ? localDateTime.slice(0, ISO_DATE_LENGTH) : getLocalizedTodayString();
}

function isAssignable(plan: PaymentPlan): boolean {
  return plan.status !== 'CANCELLED';
}

function hasNoLinkedEvent(item: PaymentPlanItem): boolean {
  return item.eventId == null;
}

/**
 * A cuota or subscription cycle that is already waiting is the natural target; when none is free
 * the event opens a new entry, which is how a payment that predates the plan's schedule gets in.
 */
function defaultItemValueFor(plan?: PaymentPlan): string {
  if (!plan) return '';

  const firstAssignableItem = (plan.items ?? []).find(hasNoLinkedEvent);
  return firstAssignableItem ? String(firstAssignableItem.id) : NEW_ITEM_VALUE;
}

/** An installment plan is finite, so it can never take one more cuota than it declares. */
function canOpenNewItem(plan: PaymentPlan): boolean {
  if (plan.planType !== 'INSTALLMENT') return true;
  return (plan.items ?? []).length < (plan.totalInstallments ?? 0);
}

interface AssignEventToPlanModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly event: FinanceEvent;
}

export function AssignEventToPlanModal({ open, onClose, event }: AssignEventToPlanModalProps) {
  const { t } = useTranslation();
  const { data: plans = [] } = usePaymentPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItemValue, setSelectedItemValue] = useState('');

  const createItem = useCreatePaymentPlanItem(selectedPlanId ?? 0);
  const updateItem = useUpdatePaymentPlanItem(selectedPlanId ?? 0);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const planOptions = useMemo(
    () =>
      plans.filter(isAssignable).map((plan) => ({
        value: String(plan.id),
        label: `${plan.name} · ${t(`paymentPlans.types.${plan.planType}`)}`,
      })),
    [plans, t]
  );

  const assignableItems = useMemo(
    () => (selectedPlan?.items ?? []).filter(hasNoLinkedEvent),
    [selectedPlan]
  );

  const canCreateItem = selectedPlan != null && canOpenNewItem(selectedPlan);

  const itemOptions = useMemo(() => {
    if (!selectedPlan) return [];

    const describeItem = (item: PaymentPlanItem) => {
      const number = t(itemNumberKey(selectedPlan.planType), { number: item.installmentNumber });
      return `${number} · ${formatDateFromParts(item.expectedDate)}`;
    };

    const existingItemOptions = assignableItems.map((item) => ({
      value: String(item.id),
      label: describeItem(item),
    }));

    if (!canOpenNewItem(selectedPlan)) return existingItemOptions;

    const newItemLabel = isGroupPlan(selectedPlan.planType)
      ? t('paymentPlans.assignNewGroupItem')
      : t('paymentPlans.assignNewItem');
    return [{ value: NEW_ITEM_VALUE, label: newItemLabel }, ...existingItemOptions];
  }, [assignableItems, selectedPlan, t]);

  const nextInstallmentNumber =
    (selectedPlan?.items ?? []).reduce((max, item) => Math.max(max, item.installmentNumber), 0) + 1;

  const closeAndReset = () => {
    setSelectedPlanId(null);
    setSelectedItemValue('');
    onClose();
  };

  const selectPlan = (value: string | number | null) => {
    const nextPlan = value ? plans.find((plan) => plan.id === Number(value)) : undefined;
    setSelectedPlanId(nextPlan?.id ?? null);
    setSelectedItemValue(defaultItemValueFor(nextPlan));
  };

  const assignToNewItem = () => {
    const dto: CreatePaymentPlanItemDto = {
      installmentNumber: nextInstallmentNumber,
      expectedDate: toDateOnly(event.transactionDate),
      itemStatus: 'PAID',
      eventId: event.id,
    };
    createItem.mutate(dto, { onSuccess: closeAndReset });
  };

  const assignToExistingItem = (target: PaymentPlanItem) => {
    const dto: CreatePaymentPlanItemDto = {
      installmentNumber: target.installmentNumber,
      expectedDate: target.expectedDate,
      itemStatus: 'PAID',
      eventId: event.id,
    };
    updateItem.mutate({ itemId: target.id, dto }, { onSuccess: closeAndReset });
  };

  const assign = () => {
    if (!selectedPlan) return;

    if (selectedItemValue === NEW_ITEM_VALUE && canCreateItem) {
      assignToNewItem();
      return;
    }

    const target = assignableItems.find((item) => String(item.id) === selectedItemValue);
    if (!target) return;
    assignToExistingItem(target);
  };

  const isPending = createItem.isPending || updateItem.isPending;

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
            loading={isPending}
            disabled={!selectedPlan || !selectedItemValue}
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

        <p className="text-xs text-dn-text-muted leading-relaxed">
          {selectedPlan && itemOptions.length === 0 ? t('paymentPlans.assignNoFreeItems') : t('paymentPlans.assignHint')}
        </p>
      </div>
    </Modal>
  );
}
