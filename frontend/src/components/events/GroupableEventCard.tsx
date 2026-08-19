import { useRef, useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent, PaymentPlan } from '@/models';
import { EventCard } from '@/components/events/EventCard';
import { Icon } from '@/components/ui/Icon';
import { Routes } from '@/lib/routes';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';
import { getGroupColor } from '@/lib/groupColors';
import { planTypeIcons } from '@/components/paymentPlans/planPresentation';

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 10;

interface GroupableEventCardProps {
  readonly event: FinanceEvent;
  readonly iconSource: 'category' | 'node';
  readonly groupPlan?: PaymentPlan;
  readonly isSelectionMode: boolean;
  readonly isSelected: boolean;
  /** Long-pressing an idle card arms selection mode with this card as the first pick. */
  readonly onLongPress: (eventId: number) => void;
  /** Tapping any card while selection mode is already active toggles it in/out, instead of navigating. */
  readonly onToggleSelected: (eventId: number) => void;
}

/**
 * Wraps `EventCard` with a Photos-style "long-press to start a multi-select, tap to add more"
 * gesture: holding a card arms selection mode on it, then a plain tap on any other card toggles it
 * into the selection — no drag precision required. The caller (`EventsPage`) owns the selection set
 * and decides what grouping it implies once confirmed.
 */
export function GroupableEventCard({
  event,
  iconSource,
  groupPlan,
  isSelectionMode,
  isSelected,
  onLongPress,
  onToggleSelected,
}: GroupableEventCardProps) {
  const { t } = useTranslation();
  const { linkStateFromHere } = useAppNavigation();
  const pressRef = useRef<{
    timer?: number;
    startX: number;
    startY: number;
    /** Set once a long-press fires so the click the browser dispatches right after pointerup can still be told apart from a plain tap, even though React state hasn't re-rendered yet by then. */
    firedLongPress: boolean;
  }>({ startX: 0, startY: 0, firedLongPress: false });

  const { data: plans = [] } = usePaymentPlans();
  const assignedPlans = useMemo(() => {
    const matched = new Map<number, PaymentPlan>();
    if (groupPlan) matched.set(groupPlan.id, groupPlan);
    if (event.paymentPlanId) {
      const p = plans.find((pl) => pl.id === event.paymentPlanId);
      if (p) matched.set(p.id, p);
    }
    for (const pl of plans) {
      if (event.id && pl.items?.some((i) => i.eventId === event.id)) {
        matched.set(pl.id, pl);
      }
    }
    return Array.from(matched.values());
  }, [groupPlan, event.paymentPlanId, event.id, plans]);

  const primaryPlan = assignedPlans[0];
  const primaryColor = primaryPlan ? getGroupColor(primaryPlan.id) : undefined;

  const clearTimer = () => {
    if (pressRef.current.timer !== undefined) {
      window.clearTimeout(pressRef.current.timer);
      pressRef.current.timer = undefined;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isSelectionMode) return;

    pressRef.current.startX = e.clientX;
    pressRef.current.startY = e.clientY;
    clearTimer();
    pressRef.current.timer = window.setTimeout(() => {
      pressRef.current.firedLongPress = true;
      navigator.vibrate?.(15);
      onLongPress(event.id);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const distance = Math.hypot(e.clientX - pressRef.current.startX, e.clientY - pressRef.current.startY);
    if (distance > MOVE_CANCEL_PX) clearTimer();
  };

  /**
   * The click that follows a long-press is dispatched before this task runs, so clearing the flag
   * here still lets `handleClickCapture` swallow it — while a press that ends with no click at all
   * (a scroll, a cancelled pointer) no longer leaves the flag armed against the next real tap.
   */
  const scheduleLongPressFlagReset = () => {
    window.setTimeout(() => {
      pressRef.current.firedLongPress = false;
    }, 0);
  };

  const handlePointerUp = () => {
    clearTimer();
    scheduleLongPressFlagReset();
  };

  const handlePointerCancel = () => {
    clearTimer();
    scheduleLongPressFlagReset();
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (pressRef.current.firedLongPress) {
      pressRef.current.firedLongPress = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelected(event.id);
    }
  };

  return (
    <div
      data-event-id={event.id}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      className={`flex items-stretch gap-2.5 rounded-lg transition-[box-shadow,transform] duration-150 ${
        isSelected ? 'relative z-10 scale-[1.01] ring-2 ring-dn-primary/70' : ''
      }`}
    >
      {primaryColor && (
        <span aria-hidden="true" style={{ backgroundColor: primaryColor }} className="w-1 shrink-0 rounded-full" />
      )}

      {isSelectionMode && (
        <span
          aria-hidden="true"
          className={`self-center w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected ? 'bg-dn-primary border-dn-primary' : 'border-dn-text-muted'
          }`}
        >
          {isSelected && <Icon name="check" className="text-xs text-white" />}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <EventCard
          event={event}
          iconSource={iconSource}
          disableLink={isSelectionMode}
          groupPlan={groupPlan}
          hidePlanBadge={Boolean(groupPlan)}
        />

        {assignedPlans.length === 1 && primaryPlan && primaryColor && (
          <Link
            to={Routes.PAYMENT_PLAN_DETAIL(primaryPlan.id)}
            state={linkStateFromHere()}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
            style={{ color: primaryColor }}
            title={primaryPlan.name}
          >
            <Icon name={planTypeIcons[primaryPlan.planType] || 'payments'} className="text-xs" />
            {primaryPlan.name}
          </Link>
        )}

        {assignedPlans.length > 1 && (
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            {assignedPlans.map((plan) => {
              const pColor = getGroupColor(plan.id);
              return (
                <Link
                  key={plan.id}
                  to={Routes.PAYMENT_PLAN_DETAIL(plan.id)}
                  state={linkStateFromHere()}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: `${pColor}22`, color: pColor }}
                  title={`${plan.name} (${t(`paymentPlans.types.${plan.planType}`)})`}
                >
                  <Icon name={planTypeIcons[plan.planType] || 'payments'} className="text-[11px]" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
