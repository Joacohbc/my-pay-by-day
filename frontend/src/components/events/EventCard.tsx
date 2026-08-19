import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent, PaymentPlan } from '@/models';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatCurrency, formatDate, eventNetAmount } from '@/lib/format';
import { NodeIcon } from '@/components/ui/NodeIcon';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useNodes } from '@/hooks/useNodes';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';
import { planTypeIcons } from '@/components/paymentPlans/planPresentation';
import { getGroupColor } from '@/lib/groupColors';

interface EventCardProps {
  readonly disableLink?: boolean;
  readonly event: FinanceEvent;
  readonly iconSource?: 'category' | 'node';
  readonly groupPlan?: PaymentPlan;
  readonly hidePlanBadge?: boolean;
}

const typeConfig = {
  INBOUND: {
    icon: 'arrow_downward',
    iconBg: 'bg-dn-success/10 text-dn-success',
    amountClass: 'text-dn-success',
    labelKey: 'eventType.INBOUND',
  },
  OUTBOUND: {
    icon: 'arrow_upward',
    iconBg: 'bg-dn-surface text-dn-text-main',
    amountClass: 'text-dn-text-main',
    labelKey: 'eventType.OUTBOUND',
  },
  OTHER: {
    icon: 'swap_horiz',
    iconBg: 'bg-dn-surface text-dn-secondary',
    amountClass: 'text-dn-secondary',
    labelKey: 'eventType.OTHER',
  },
};

export function EventCard({ event, disableLink, iconSource = 'category', groupPlan, hidePlanBadge }: EventCardProps) {
  const { t } = useTranslation();
  const { linkStateFromHere } = useAppNavigation();
  const cfg = typeConfig[event.type as keyof typeof typeConfig] || typeConfig.OTHER;
  const net = eventNetAmount(event);
  const date = event.transactionDate;
  const lineItems = event.lineItems ?? [];

  const { data: nodesResponse } = useNodes();
  const nodes = Array.isArray(nodesResponse) ? nodesResponse : nodesResponse || [];

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
      if (event.draftId && pl.items?.some((i) => i.draftId === event.draftId)) {
        matched.set(pl.id, pl);
      }
    }
    return Array.from(matched.values());
  }, [groupPlan, event.paymentPlanId, event.id, event.draftId, plans]);

  const primaryPlan = assignedPlans[0];
  const groupColor = primaryPlan ? getGroupColor(primaryPlan.id) : undefined;

  const MAX_ICONS = 3;
  const uniqueNodes = lineItems.reduce<{ item: typeof lineItems[0]; count: number }[]>((acc, item) => {
    const existing = acc.find(n => n.item.financeNodeId === item.financeNodeId);
    if (existing) existing.count++;
    else acc.push({ item, count: 1 });
    return acc;
  }, []);

  const nodeIconGroup = (
    <div className="flex shrink-0 items-center">
      {uniqueNodes.slice(0, MAX_ICONS).map(({ item, count }, i) => {
        const matchedNode = nodes.find(n => n.id === item.financeNodeId);
        return (
          <div key={item.financeNodeId} className={`relative shrink-0 ${i > 0 ? ' -ml-2' : ''}`} style={{ zIndex: MAX_ICONS - i }}>
            <NodeIcon node={matchedNode || item} size={uniqueNodes.length === 1 ? 'lg' : 'md'} shape="rounded-full" className="ring-2 ring-dn-bg" />
            {count > 1 && (
              <span className="absolute -bottom-1 -right-1 min-w-[1rem] h-4 px-0.5 rounded-full bg-dn-surface border border-dn-border flex items-center justify-center text-[9px] font-bold text-dn-text-muted leading-none">
                {count}
              </span>
            )}
          </div>
        );
      })}
      {uniqueNodes.length > MAX_ICONS && (
        <span className="-ml-2 w-8 h-8 rounded-full bg-dn-surface ring-2 ring-dn-bg flex items-center justify-center text-xs text-dn-text-muted font-medium shrink-0">
          +{uniqueNodes.length - MAX_ICONS}
        </span>
      )}
    </div>
  );

  const planBadgeElement = primaryPlan ? (
    <span
      title={assignedPlans.map((p) => `${p.name} (${t(`paymentPlans.types.${p.planType}`)})`).join(', ')}
      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white flex items-center justify-center ring-2 ring-dn-bg z-10"
      style={{ backgroundColor: groupColor }}
    >
      <Icon name={planTypeIcons[primaryPlan.planType] || 'payments'} className="text-[11px]" />
    </span>
  ) : event.paymentPlanId ? (
    <span
      title={t('drafts.linkedToPlan')}
      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-dn-primary text-white flex items-center justify-center ring-2 ring-dn-bg z-10"
    >
      <Icon name="payments" className="text-[11px]" />
    </span>
  ) : null;

  const content = (
    <>
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Icon */}
        {event.isDraft ? (
          <div className="relative w-12 h-12 rounded-full flex items-center justify-center bg-dn-surface-low text-dn-text-muted border border-dashed border-white/20 shrink-0">
            <Icon name="draft" />
            {planBadgeElement}
          </div>
        ) : (
          <div className="relative shrink-0">
            {iconSource === 'category' && event.category ? (
              <CategoryIcon category={event.category} size="lg" shape="rounded-full" />
            ) : (
              nodeIconGroup
            )}
            {planBadgeElement}
          </div>
        )}

        {/* Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-base font-medium text-dn-text-main flex items-center gap-2 min-w-0">
            <span className="truncate">{event.name || t('drafts.untitledDraft')}</span>
          </span>
          <span className="text-xs text-dn-text-muted flex items-center gap-1.5 flex-wrap">
            <span>{event.category?.name ?? t(cfg.labelKey)}</span>
            {date ? <span>· {formatDate(date)}</span> : null}
            {!hidePlanBadge && assignedPlans.length === 1 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: `${getGroupColor(assignedPlans[0].id)}1a`, color: getGroupColor(assignedPlans[0].id) }}
                title={`${assignedPlans[0].name} · ${t(`paymentPlans.types.${assignedPlans[0].planType}`)}`}
              >
                <Icon name={planTypeIcons[assignedPlans[0].planType] || 'payments'} className="text-[10px]" />
                <span className="truncate max-w-[120px]">{assignedPlans[0].name}</span>
              </span>
            )}
            {!hidePlanBadge && assignedPlans.length > 1 && (
              <span className="inline-flex items-center gap-1 shrink-0">
                {assignedPlans.map((assignedPlan) => {
                  const planColor = getGroupColor(assignedPlan.id);
                  return (
                    <span
                      key={assignedPlan.id}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                      style={{ backgroundColor: `${planColor}22`, color: planColor }}
                      title={`${assignedPlan.name} (${t(`paymentPlans.types.${assignedPlan.planType}`)})`}
                    >
                      <Icon name={planTypeIcons[assignedPlan.planType] || 'payments'} className="text-[11px]" />
                    </span>
                  );
                })}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Amount */}
      <span className={`font-mono text-sm shrink-0 whitespace-nowrap ${event.isDraft ? 'text-dn-text-muted' : cfg.amountClass}`}>
        {!event.isDraft && event.type === 'INBOUND' ? '+' : ''}
        {!event.isDraft && event.type === 'OUTBOUND' ? '-' : ''}
        {formatCurrency(Math.abs(net || 0))}
      </span>
    </>
  );

  const containerClass = "flex items-center w-full justify-between group active:scale-[0.99] transition-transform py-1";

  if (disableLink) {
    return <div className={containerClass}>{content}</div>;
  }

  let finalTo = `/events/${event.id}`;

  // If the event is a draft, the route is /events/:id/edit or /events/new
  if (event.isDraft) {
    finalTo = event.id ? `/events/${event.id}/edit` : '/events/new';
  }

  return (
    <Link to={finalTo} state={linkStateFromHere({ draft: event })} className={containerClass}>
      {content}
    </Link>
  );
}
