import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreatePaymentPlanDto, FinanceEvent, PaymentPlan } from '@/models';
import { useCreatePaymentPlan, useAddEventToGroupPlan, usePaymentPlans } from '@/hooks/usePaymentPlans';
import { addEventsToGroupPlan } from '@/lib/groupPlanHelpers';
import { getLocalizedTodayString } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

const NEW_GROUP_VALUE = 'NEW';

function isAssignableGroupPlan(plan: PaymentPlan): boolean {
  return plan.planType === 'GROUP' && plan.status !== 'CANCELLED';
}

interface AssignSelectionToGroupModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Every event is expected to be ungrouped already — a mixed selection is resolved by the caller before this opens. */
  readonly selectedEvents: FinanceEvent[];
  readonly onAssigned: () => void;
}

/**
 * Confirms a long-press selection of ungrouped events by either dropping them into an existing
 * GROUP plan or spinning up a new one — the two ways the same selection can become a group.
 */
export function AssignSelectionToGroupModal({
  open,
  onClose,
  selectedEvents,
  onAssigned,
}: AssignSelectionToGroupModalProps) {
  const { t } = useTranslation();
  const { data: plans = [] } = usePaymentPlans();
  const createGroupPlan = useCreatePaymentPlan();
  const addEventToGroup = useAddEventToGroupPlan();

  const [targetPlanValue, setTargetPlanValue] = useState<string>(NEW_GROUP_VALUE);
  const [nameOverride, setNameOverride] = useState('');

  const firstEventName = selectedEvents[0]?.name || t('drafts.untitledDraft');
  const defaultGroupName = t('events.group.defaultName', { name: firstEventName });

  const groupPlanOptions = useMemo(
    () => [
      { value: NEW_GROUP_VALUE, label: t('events.group.newGroupOption') },
      ...plans
        .filter(isAssignableGroupPlan)
        .map((plan) => ({ value: String(plan.id), label: plan.name })),
    ],
    [plans, t]
  );

  const closeAndReset = () => {
    setTargetPlanValue(NEW_GROUP_VALUE);
    setNameOverride('');
    onClose();
  };

  const assignToExistingPlan = async (plan: PaymentPlan) => {
    try {
      await addEventsToGroupPlan(plan, selectedEvents, addEventToGroup.mutateAsync);
    } catch {
      return;
    }
    onAssigned();
    closeAndReset();
  };

  const createNewPlan = async () => {
    const dto: CreatePaymentPlanDto = {
      name: nameOverride.trim() || defaultGroupName,
      planType: 'GROUP',
      startDate: getLocalizedTodayString(),
      isAutomated: false,
      autoCreateDraft: false,
      generateItems: false,
      eventIds: selectedEvents.map((event) => event.id),
    };

    try {
      await createGroupPlan.mutateAsync(dto);
    } catch {
      return;
    }
    onAssigned();
    closeAndReset();
  };

  const confirm = () => {
    if (targetPlanValue === NEW_GROUP_VALUE) {
      createNewPlan();
      return;
    }
    const plan = plans.find((p) => String(p.id) === targetPlanValue);
    if (plan) assignToExistingPlan(plan);
  };

  const isPending = createGroupPlan.isPending || addEventToGroup.isPending;

  return (
    <Modal
      open={open}
      onClose={closeAndReset}
      title={t('events.group.assignTitle')}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={closeAndReset}>
            {t('common.cancel')}
          </Button>
          <Button type="button" size="sm" loading={isPending} onClick={confirm}>
            {t('common.confirm')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-dn-text-muted">
          {t('events.group.assignHint', { count: selectedEvents.length })}
        </p>

        <SearchableSelect
          label={t('events.group.assignPlanLabel')}
          options={groupPlanOptions}
          value={targetPlanValue}
          onChange={(value) => setTargetPlanValue(value ? String(value) : NEW_GROUP_VALUE)}
        />

        {targetPlanValue === NEW_GROUP_VALUE && (
          <Input
            label={t('paymentPlans.nameLabel')}
            placeholder={defaultGroupName}
            value={nameOverride}
            onChange={(e) => setNameOverride(e.target.value)}
          />
        )}
      </div>
    </Modal>
  );
}
