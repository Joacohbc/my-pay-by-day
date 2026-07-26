import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreatePaymentPlanItemDto, FinanceEvent, PaymentPlan, PaymentPlanItem } from '@/models';
import { useCreatePaymentPlanItem, usePaymentPlans, useUpdatePaymentPlanItem } from '@/hooks/usePaymentPlans';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { eventNetAmount, formatCurrency, formatDateFromParts, getLocalizedTodayString } from '@/lib/format';

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

interface AssignEventToPlanModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly event: FinanceEvent;
}

export function AssignEventToPlanModal({ open, onClose, event }: AssignEventToPlanModalProps) {
  const { t } = useTranslation();
  const { data: plans = [] } = usePaymentPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItemValue, setSelectedItemValue] = useState(NEW_ITEM_VALUE);

  const createItem = useCreatePaymentPlanItem(selectedPlanId ?? 0);
  const updateItem = useUpdatePaymentPlanItem(selectedPlanId ?? 0);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const eventAmount = Math.abs(eventNetAmount(event));

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

  const itemOptions = useMemo(() => {
    const describeItem = (item: PaymentPlanItem) => {
      const number = t('paymentPlans.itemNumber', { number: item.installmentNumber });
      const date = formatDateFromParts(item.expectedDate);
      const amount = item.expectedAmount != null ? ` · ${formatCurrency(item.expectedAmount)}` : '';
      return `${number} · ${date}${amount}`;
    };

    return [
      { value: NEW_ITEM_VALUE, label: t('paymentPlans.assignNewItem') },
      ...assignableItems.map((item) => ({ value: String(item.id), label: describeItem(item) })),
    ];
  }, [assignableItems, t]);

  const nextInstallmentNumber =
    (selectedPlan?.items ?? []).reduce((max, item) => Math.max(max, item.installmentNumber), 0) + 1;

  const closeAndReset = () => {
    setSelectedPlanId(null);
    setSelectedItemValue(NEW_ITEM_VALUE);
    onClose();
  };

  const assignToNewItem = () => {
    const dto: CreatePaymentPlanItemDto = {
      installmentNumber: nextInstallmentNumber,
      expectedDate: toDateOnly(event.transactionDate),
      expectedAmount: eventAmount,
      itemStatus: 'PAID',
      eventId: event.id,
    };
    createItem.mutate(dto, { onSuccess: closeAndReset });
  };

  const assignToExistingItem = (target: PaymentPlanItem) => {
    const dto: CreatePaymentPlanItemDto = {
      installmentNumber: target.installmentNumber,
      expectedDate: target.expectedDate,
      expectedAmount: target.expectedAmount ?? eventAmount,
      itemStatus: 'PAID',
      eventId: event.id,
    };
    updateItem.mutate({ itemId: target.id, dto }, { onSuccess: closeAndReset });
  };

  const assign = () => {
    if (!selectedPlan) return;

    if (selectedItemValue === NEW_ITEM_VALUE) {
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
          <Button type="button" size="sm" loading={isPending} disabled={!selectedPlan} onClick={assign}>
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
          onChange={(value) => {
            setSelectedPlanId(value ? Number(value) : null);
            setSelectedItemValue(NEW_ITEM_VALUE);
          }}
        />

        {selectedPlan && (
          <SearchableSelect
            label={t('paymentPlans.assignItemLabel')}
            options={itemOptions}
            value={selectedItemValue}
            onChange={(value) => setSelectedItemValue(value ? String(value) : NEW_ITEM_VALUE)}
          />
        )}

        <p className="text-xs text-dn-text-muted leading-relaxed">{t('paymentPlans.assignHint')}</p>
      </div>
    </Modal>
  );
}
