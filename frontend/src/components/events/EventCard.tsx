import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FinanceEvent } from '@/models';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatCurrency, formatDate, eventNetAmount } from '@/lib/format';

interface EventCardProps {
  readonly disableLink?: boolean;
  readonly event: FinanceEvent;
  readonly to?: string;
  readonly state?: unknown;
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

export function EventCard({ event, disableLink }: EventCardProps) {
  const { t } = useTranslation();
  const cfg = typeConfig[event.type as keyof typeof typeConfig] || typeConfig.OTHER;
  const net = eventNetAmount(event);
  const date = event.transactionDate;

  const content = (
    <>
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Icon */}
        {event.category && !event.isDraft ? (
          <CategoryIcon category={event.category} size="lg" shape="rounded-full" />
        ) : (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${event.isDraft ? 'bg-dn-surface-low text-dn-text-muted border border-dashed border-white/20' : cfg.iconBg}`}>
            <Icon name={event.isDraft ? 'draft' : cfg.icon} />
          </div>
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
    <Link to={finalTo} className={containerClass}>
      {content}
    </Link>
  );
}
