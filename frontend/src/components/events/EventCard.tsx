import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Tag as TagIcon } from 'lucide-react';
import type { FinanceEvent } from '@/models';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, eventNetAmount } from '@/lib/format';

interface EventCardProps {
  event: FinanceEvent;
}

const typeConfig = {
  INBOUND: {
    Icon: ArrowDownLeft,
    iconBg: 'bg-emerald-950 text-emerald-400',
    amountClass: 'text-emerald-400',
    badgeVariant: 'income' as const,
    label: 'Income',
  },
  OUTBOUND: {
    Icon: ArrowUpRight,
    iconBg: 'bg-rose-950 text-rose-400',
    amountClass: 'text-rose-400',
    badgeVariant: 'expense' as const,
    label: 'Expense',
  },
  OTHER: {
    Icon: ArrowLeftRight,
    iconBg: 'bg-amber-950 text-amber-400',
    amountClass: 'text-amber-400',
    badgeVariant: 'neutral' as const,
    label: 'Transfer',
  },
};

export function EventCard({ event }: EventCardProps) {
  const cfg = typeConfig[event.type];
  const { Icon } = cfg;
  const net = eventNetAmount(event);
  const date = event.transaction?.transactionDate;

  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center gap-3 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors group"
    >
      {/* Icon */}
      <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl ${cfg.iconBg}`}>
        <Icon size={18} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
            {event.name}
          </p>
          {event.category && (
            <Badge variant="default" className="shrink-0">
              {event.category.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {date && (
            <span className="text-xs text-zinc-500">{formatDate(date)}</span>
          )}
          {event.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <TagIcon size={10} className="text-zinc-600" />
              {event.tags.slice(0, 2).map((t) => (
                <span key={t.id} className="text-xs text-zinc-600">
                  #{t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Amount */}
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${cfg.amountClass}`}>
        {event.type === 'INBOUND' ? '+' : event.type === 'OUTBOUND' ? '-' : ''}
        {formatCurrency(Math.abs(net))}
      </span>
    </Link>
  );
}
