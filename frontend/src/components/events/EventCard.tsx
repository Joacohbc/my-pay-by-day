import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent } from '@/models';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatCurrency, formatDate, eventNetAmount } from '@/lib/format';
import { NodeIcon } from '@/components/ui/NodeIcon';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useNodes } from '@/hooks/useNodes';

interface EventCardProps {
  readonly disableLink?: boolean;
  readonly event: FinanceEvent;
  readonly iconSource?: 'category' | 'node';
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

export function EventCard({ event, disableLink, iconSource = 'category' }: EventCardProps) {
  const { t } = useTranslation();
  const { linkStateFromHere } = useAppNavigation();
  const cfg = typeConfig[event.type as keyof typeof typeConfig] || typeConfig.OTHER;
  const net = eventNetAmount(event);
  const date = event.transactionDate;
  const lineItems = event.lineItems ?? [];

  const { data: nodesResponse } = useNodes();
  const nodes = Array.isArray(nodesResponse) ? nodesResponse : nodesResponse || [];

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

  const content = (
    <>
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Icon */}
        {event.isDraft ? (
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-dn-surface-low text-dn-text-muted border border-dashed border-white/20">
            <Icon name="draft" />
          </div>
        ) : iconSource === 'category' && event.category ? (
          <CategoryIcon category={event.category} size="lg" shape="rounded-full" />
        ) : (
          nodeIconGroup
        )}

        {/* Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-base font-medium text-dn-text-main flex items-center gap-2 min-w-0">
            <span className="truncate">{event.name || t('drafts.untitledDraft')}</span>
          </span>
          <span className="text-xs text-dn-text-muted">
            {event.category?.name ?? t(cfg.labelKey)}
            {date ? ` · ${formatDate(date)}` : ''}
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
