import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent, PaymentPlan } from '@/models';
import { useAddEventToGroupPlan } from '@/hooks/usePaymentPlans';
import { addEventsToGroupPlan } from '@/lib/groupPlanHelpers';
import { useAlert } from '@/contexts/AlertContext';

const MIN_EVENTS_TO_GROUP = 2;

/**
 * Owns the "long-press one card, tap the others, confirm from a floating bar" selection on the
 * events list. Confirming resolves the one case the caller cannot: a selection that already touches
 * exactly one group joins that group directly, one that touches none opens the assign modal, and one
 * that spans two groups is refused — merging groups is not supported.
 */
export function useEventGroupSelection(events: FinanceEvent[], planByEventId: Map<number, PaymentPlan>) {
  const { t } = useTranslation();
  const alert = useAlert();
  const addEventToGroup = useAddEventToGroupPlan();

  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const isSelectionMode = selectedEventIds.size > 0;

  const selectedEvents = useMemo(
    () => events.filter((event) => selectedEventIds.has(event.id)),
    [events, selectedEventIds]
  );

  const startSelection = useCallback((eventId: number) => {
    setSelectedEventIds(new Set([eventId]));
  }, []);

  const toggleSelected = useCallback((eventId: number) => {
    setSelectedEventIds((previous) => {
      const next = new Set(previous);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }, []);

  const cancelSelection = useCallback(() => setSelectedEventIds(new Set()), []);

  const closeAssignModal = useCallback(() => setIsAssignModalOpen(false), []);

  const confirmSelection = useCallback(async () => {
    if (selectedEvents.length < MIN_EVENTS_TO_GROUP) return;

    const plansInSelection = new Map<number, PaymentPlan>();
    const ungroupedEvents: FinanceEvent[] = [];
    for (const selectedEvent of selectedEvents) {
      const plan = planByEventId.get(selectedEvent.id);
      if (plan) {
        plansInSelection.set(plan.id, plan);
      } else {
        ungroupedEvents.push(selectedEvent);
      }
    }

    if (plansInSelection.size > 1) {
      alert.error(t('events.group.alreadyGrouped'));
      return;
    }

    if (plansInSelection.size === 0) {
      setIsAssignModalOpen(true);
      return;
    }

    const [targetPlan] = plansInSelection.values();
    try {
      await addEventsToGroupPlan(targetPlan, ungroupedEvents, addEventToGroup.mutateAsync);
    } catch {
      return;
    }
    cancelSelection();
  }, [selectedEvents, planByEventId, addEventToGroup, alert, t, cancelSelection]);

  return {
    selectedEventIds,
    selectedEvents,
    isSelectionMode,
    isAssignModalOpen,
    isAddingToGroup: addEventToGroup.isPending,
    startSelection,
    toggleSelected,
    cancelSelection,
    confirmSelection,
    closeAssignModal,
  };
}
