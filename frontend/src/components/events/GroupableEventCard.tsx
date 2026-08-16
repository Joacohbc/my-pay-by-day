import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { FinanceEvent, PaymentPlan } from '@/models';
import { EventCard } from '@/components/events/EventCard';
import { Icon } from '@/components/ui/Icon';
import { Routes } from '@/lib/routes';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { getGroupColor } from '@/lib/groupColors';

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 10;
const DROP_TARGET_OUTLINE = '2px solid var(--color-dn-primary)';

interface GroupableEventCardProps {
  readonly event: FinanceEvent;
  readonly iconSource: 'category' | 'node';
  readonly groupPlan?: PaymentPlan;
  readonly onDropEvent: (sourceEventId: number, targetEventId: number) => void;
}

/**
 * Wraps `EventCard` with a Drafts-style "long-press, drag onto another card" gesture: holding a
 * card arms it, dragging highlights whichever card is currently underneath the pointer, and
 * releasing over a different card reports the pair to `onDropEvent` for the caller to decide what
 * grouping that pair implies. Everything here is pointer-driven and DOM-local (drop-target
 * highlighting is applied directly to the target element) so the drag stays smooth without routing
 * every pointermove through React state.
 */
export function GroupableEventCard({ event, iconSource, groupPlan, onDropEvent }: GroupableEventCardProps) {
  const { t } = useTranslation();
  const { linkStateFromHere } = useAppNavigation();
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    timer?: number;
    armed: boolean;
    /** Set once a drag ends so the click the browser fires right after pointerup can still be told apart from a plain tap, even though React state hasn't re-rendered yet by then. */
    justDragged: boolean;
    startX: number;
    startY: number;
    dropTarget: HTMLElement | null;
  }>({ armed: false, justDragged: false, startX: 0, startY: 0, dropTarget: null });
  const [isArmed, setIsArmed] = useState(false);

  const clearTimer = () => {
    if (dragRef.current.timer !== undefined) {
      window.clearTimeout(dragRef.current.timer);
      dragRef.current.timer = undefined;
    }
  };

  const clearDropTargetHighlight = () => {
    if (dragRef.current.dropTarget) {
      dragRef.current.dropTarget.style.outline = '';
      dragRef.current.dropTarget = null;
    }
  };

  const resolveElementUnderPointer = (clientX: number, clientY: number): HTMLElement | null => {
    const el = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-event-id]');
    return el && el !== rootRef.current ? el : null;
  };

  const endDrag = (dropTargetEl: HTMLElement | null) => {
    clearTimer();
    clearDropTargetHighlight();
    dragRef.current.justDragged = dragRef.current.armed;
    dragRef.current.armed = false;
    setIsArmed(false);

    const targetIdAttr = dropTargetEl?.getAttribute('data-event-id');
    const targetId = targetIdAttr ? Number(targetIdAttr) : NaN;
    if (Number.isFinite(targetId) && targetId !== event.id) {
      onDropEvent(event.id, targetId);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.armed = false;
    clearTimer();

    const pointerId = e.pointerId;
    dragRef.current.timer = window.setTimeout(() => {
      dragRef.current.armed = true;
      setIsArmed(true);
      rootRef.current?.setPointerCapture(pointerId);
      navigator.vibrate?.(15);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.armed) {
      const distance = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY);
      if (distance > MOVE_CANCEL_PX) clearTimer();
      return;
    }

    e.preventDefault();
    const target = resolveElementUnderPointer(e.clientX, e.clientY);
    if (target !== dragRef.current.dropTarget) {
      clearDropTargetHighlight();
      if (target) target.style.outline = DROP_TARGET_OUTLINE;
      dragRef.current.dropTarget = target;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.armed) {
      clearTimer();
      return;
    }
    endDrag(resolveElementUnderPointer(e.clientX, e.clientY));
  };

  const handlePointerCancel = () => endDrag(null);

  const suppressClickAfterDrag = (e: React.MouseEvent) => {
    if (dragRef.current.justDragged) {
      dragRef.current.justDragged = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const groupColor = groupPlan ? getGroupColor(groupPlan.id) : undefined;

  return (
    <div
      ref={rootRef}
      data-event-id={event.id}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={suppressClickAfterDrag}
      style={{ touchAction: isArmed ? 'none' : undefined }}
      className={`flex items-stretch gap-2.5 rounded-lg transition-[box-shadow,transform] duration-150 ${
        isArmed ? 'relative z-10 scale-[1.02] shadow-lg ring-2 ring-dn-primary/60' : ''
      }`}
    >
      {groupColor && (
        <span
          aria-hidden="true"
          style={{ backgroundColor: groupColor }}
          className="w-1 shrink-0 rounded-full"
        />
      )}

      <div className="flex-1 min-w-0">
        <EventCard event={event} iconSource={iconSource} disableLink={isArmed} />

        {groupPlan && groupColor && (
          <Link
            to={Routes.PAYMENT_PLAN_DETAIL(groupPlan.id)}
            state={linkStateFromHere()}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
            style={{ color: groupColor }}
            title={t('events.group.viewGroup')}
          >
            <Icon name="workspaces" className="text-xs" />
            {groupPlan.name}
          </Link>
        )}
      </div>
    </div>
  );
}
