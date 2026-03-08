import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEvent, useDeleteEvent } from '@/hooks/useEvents';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency, formatDateTime, eventNetAmount } from '@/lib/format';

const typeConfig = {
  INBOUND: {
    icon: 'arrow_downward',
    iconBg: 'bg-dn-success/10 text-dn-success',
    amountClass: 'text-dn-success',
    labelKey: 'eventType.INBOUND',
    badgeVariant: 'income' as const,
  },
  OUTBOUND: {
    icon: 'arrow_upward',
    iconBg: 'bg-dn-surface text-dn-text-main',
    amountClass: 'text-dn-text-main',
    labelKey: 'eventType.OUTBOUND',
    badgeVariant: 'expense' as const,
  },
  OTHER: {
    icon: 'swap_horiz',
    iconBg: 'bg-dn-surface text-dn-secondary',
    amountClass: 'text-dn-secondary',
    labelKey: 'eventType.OTHER',
    badgeVariant: 'neutral' as const,
  },
};

export function EventDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(Number(id));
  const deleteEvent = useDeleteEvent();

  if (isLoading) return <FullPageSpinner />;
  if (error || !event) return <ErrorState message={t('errors.eventNotFound')} />;

  const cfg = typeConfig[event.type];
  const net = eventNetAmount(event);

  const handleDelete = async () => {
    if (!confirm(t('events.deleteConfirm'))) return;
    await deleteEvent.mutateAsync(event.id);
    navigate('/events', { replace: true });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('events.detail')}
        back
        action={
          <div className="flex gap-2">
            <Link to={`/events/${event.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Icon name="edit" className="text-base" />
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={deleteEvent.isPending}
            >
              <Icon name="delete" className="text-base" />
            </Button>
          </div>
        }
      />

      {/* Hero */}
      <div className="px-5 flex flex-col items-center text-center">
        <div className={`w-16 h-16 flex items-center justify-center rounded-full mb-4 ${cfg.iconBg}`}>
          <Icon name={cfg.icon} className="text-3xl" />
        </div>

        <h2 className="text-xl font-semibold text-dn-text-main tracking-tight">{event.name}</h2>
        {event.description && (
          <p className="text-sm text-dn-text-muted mt-1">{event.description}</p>
        )}

        <p className={`text-4xl font-mono font-bold tracking-tight mt-3 ${cfg.amountClass}`}>
          {event.type === 'INBOUND' ? '+' : event.type === 'OUTBOUND' ? '-' : ''}
          {formatCurrency(Math.abs(net))}
        </p>

        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <Badge variant={cfg.badgeVariant}>{t(cfg.labelKey)}</Badge>
          {event.category && <Badge variant="default">{event.category.name}</Badge>}
          {event.tags.map((tag) => (
            <Badge key={tag.id} variant="indigo">#{tag.name}</Badge>
          ))}
        </div>
      </div>

      {/* Details Card */}
      <div className="px-5">
        <Card className="divide-y divide-white/5">
          {event.category && (
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-dn-text-muted">{t('events.category')}</span>
              <span className="text-sm text-dn-text-main">{event.category.name}</span>
            </div>
          )}
          {event.transactionDate && (
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-dn-text-muted">{t('events.date')}</span>
              <span className="text-sm text-dn-text-main font-mono">
                {formatDateTime(event.transactionDate)}
              </span>
            </div>
          )}
          {event.receiptUrl && (
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-dn-text-muted">{t('events.receipt')}</span>
              <a
                href={event.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-dn-primary flex items-center gap-1"
              >
                {t('common.view')}
                <Icon name="open_in_new" className="text-sm" />
              </a>
            </div>
          )}
        </Card>
      </div>

      {/* Line Items */}
      <div className="px-5">
        <h3 className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">{t('events.lineItems')}</h3>
        {event.lineItems?.length ? (
          <Card className="divide-y divide-white/5">
            {event.lineItems.map((li) => (
              <div key={li.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-dn-text-main">{li.financeNodeName}</p>
                </div>
                <span className={`text-sm font-mono ${Number(li.amount) >= 0 ? 'text-dn-success' : 'text-dn-error'}`}>
                  {Number(li.amount) >= 0 ? '+' : ''}
                  {formatCurrency(Number(li.amount))}
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState title={t('events.noLineItems')} />
        )}
      </div>
    </div>
  );
}
