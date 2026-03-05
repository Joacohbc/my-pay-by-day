import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Pencil,
  Trash2,
  Receipt,
  Tag as TagIcon,
} from 'lucide-react';
import { useEvent, useDeleteEvent } from '@/hooks/useEvents';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDateTime, eventNetAmount } from '@/lib/format';

const typeConfig = {
  INBOUND: {
    Icon: ArrowDownLeft,
    iconBg: 'bg-emerald-950 text-emerald-400',
    amountClass: 'text-emerald-400',
    label: 'Income',
    badgeVariant: 'income' as const,
  },
  OUTBOUND: {
    Icon: ArrowUpRight,
    iconBg: 'bg-rose-950 text-rose-400',
    amountClass: 'text-rose-400',
    label: 'Expense',
    badgeVariant: 'expense' as const,
  },
  OTHER: {
    Icon: ArrowLeftRight,
    iconBg: 'bg-amber-950 text-amber-400',
    amountClass: 'text-amber-400',
    label: 'Transfer',
    badgeVariant: 'neutral' as const,
  },
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(Number(id));
  const deleteEvent = useDeleteEvent();

  if (isLoading) return <FullPageSpinner />;
  if (error || !event) return <ErrorState message="Event not found" />;

  const cfg = typeConfig[event.type];
  const { Icon } = cfg;
  const net = eventNetAmount(event);

  const handleDelete = async () => {
    if (!confirm('Delete this event permanently?')) return;
    await deleteEvent.mutateAsync(event.id);
    navigate('/events', { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Event Detail"
        back
        action={
          <div className="flex gap-2">
            <Link to={`/events/${event.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil size={14} />
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={deleteEvent.isPending}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        }
      />

      {/* Hero card */}
      <div className="px-4">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${cfg.iconBg}`}>
              <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-zinc-100">{event.name}</h2>
              {event.description && (
                <p className="text-sm text-zinc-400 truncate">{event.description}</p>
              )}
            </div>
          </div>

          <div className={`text-3xl font-bold tabular-nums mb-4 ${cfg.amountClass}`}>
            {event.type === 'INBOUND' ? '+' : event.type === 'OUTBOUND' ? '-' : ''}
            {formatCurrency(Math.abs(net))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
            {event.category && (
              <Badge variant="default">{event.category.name}</Badge>
            )}
            {event.tags.map((tag) => (
              <Badge key={tag.id} variant="indigo">
                <TagIcon size={9} className="mr-1" />#{tag.name}
              </Badge>
            ))}
          </div>

          {event.transaction?.transactionDate && (
            <p className="text-xs text-zinc-500 mt-3">
              {formatDateTime(event.transaction.transactionDate)}
            </p>
          )}
        </Card>
      </div>

      {/* Line Items */}
      <div className="px-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Line Items</h3>
        <div className="space-y-2">
          {event.transaction?.lineItems?.length ? (
            event.transaction.lineItems.map((li) => (
              <Card key={li.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {li.financeNode.name}
                    </p>
                    <p className="text-xs text-zinc-500">{li.financeNode.type}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      Number(li.amount) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {Number(li.amount) >= 0 ? '+' : ''}
                    {formatCurrency(Number(li.amount))}
                  </span>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState title="No line items" />
          )}
        </div>
      </div>

      {/* Receipt */}
      {event.receiptUrl && (
        <div className="px-4">
          <a
            href={event.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
          >
            <Receipt size={14} />
            View Receipt
          </a>
        </div>
      )}
    </div>
  );
}
