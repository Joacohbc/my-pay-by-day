import { Link } from 'react-router-dom';
import type { FinanceEvent } from '@/models';
import { formatCurrency, formatDate, eventNetAmount } from '@/lib/format';

interface EventCardProps {
  event: FinanceEvent;
}

const typeConfig = {
  INBOUND: {
    icon: 'arrow_downward',
    iconBg: 'bg-dn-success/10 text-dn-success',
    amountClass: 'text-dn-success',
    label: 'Income',
  },
  OUTBOUND: {
    icon: 'arrow_upward',
    iconBg: 'bg-dn-surface text-dn-text-main',
    amountClass: 'text-dn-text-main',
    label: 'Expense',
  },
  OTHER: {
    icon: 'swap_horiz',
    iconBg: 'bg-dn-surface text-dn-secondary',
    amountClass: 'text-dn-secondary',
    label: 'Transfer',
  },
};

export function EventCard({ event }: EventCardProps) {
  const cfg = typeConfig[event.type];
  const net = eventNetAmount(event);
  const date = event.transaction?.transactionDate;

  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center justify-between group active:scale-[0.99] transition-transform py-1"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${cfg.iconBg}`}>
          <span className="material-symbols-outlined">{cfg.icon}</span>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <span className="text-base font-medium text-dn-text-main">
            {event.name}
          </span>
          <span className="text-xs text-dn-text-muted">
            {event.category?.name ?? cfg.label}
            {date ? ` · ${formatDate(date)}` : ''}
          </span>
        </div>
      </div>

      {/* Amount */}
      <span className={`font-mono text-sm ${cfg.amountClass}`}>
        {event.type === 'INBOUND' ? '+' : event.type === 'OUTBOUND' ? '-' : ''}
        {formatCurrency(Math.abs(net))}
      </span>
    </Link>
  );
}
