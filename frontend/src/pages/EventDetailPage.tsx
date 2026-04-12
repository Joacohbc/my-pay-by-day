import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventsRoute } from '@/lib/routes';
import { useEvent, useDeleteEvent, useUpdateEvent } from '@/hooks/useEvents';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatCurrency, formatDateTime, eventNetAmount } from '@/lib/format';
import { useState } from 'react';
import { RelatedEventsSection } from '@/components/events/RelatedEventsSection';
import { FileUploader } from '@/components/ui/FileUploader';
import type { FileDto } from '@/models';

const eventTypeConfig = {
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
  const updateEvent = useUpdateEvent();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (isLoading) return <FullPageSpinner />;
  if (error || !event) return <ErrorState message={t('errors.eventNotFound')} />;

  const cfg = eventTypeConfig[event.type];
  const net = eventNetAmount(event);

  const confirmDelete = async () => {
    await deleteEvent.mutateAsync(event.id);
    navigate(eventsRoute());
  };

  const handleAddFile = async (file: FileDto) => {
    if (!event) return;
    const currentIds = event.files?.map((f) => f.id) || [];
    if (!currentIds.includes(file.id)) {
      await updateEvent.mutateAsync({ id: event.id, dto: { fileIds: [...currentIds, file.id] } });
    }
  };

  const handleRemoveFile = async (fileId: number) => {
    if (!event) return;
    const currentIds = event.files?.map((f) => f.id) || [];
    await updateEvent.mutateAsync({ id: event.id, dto: { fileIds: currentIds.filter((id) => id !== fileId) } });
  };

  return (
    <div className="space-y-5">
      <ConfirmModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={t('events.deleteConfirm')}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={deleteEvent.isPending}
      />

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
              onClick={() => setIsConfirmOpen(true)}
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
          {event.category && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-dn-surface text-dn-text-main text-xs font-medium">
              <CategoryIcon category={event.category} size="sm" />
              {event.category.name}
            </div>
          )}
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
              <div className="flex items-center gap-2">
                <CategoryIcon category={event.category} size="sm" />
                <span className="text-sm text-dn-text-main">{event.category.name}</span>
              </div>
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
        </Card>
      </div>

      {/* Line Items */}
      <div className="px-5">
        <h3 className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">{t('events.lineItems')}</h3>
        {event.lineItems?.length ? (
          <Card className="divide-y divide-white/5">
            {event.lineItems.map((li, index) => (
              <div key={`${li.financeNodeId}_${index}`} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
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

      {/* Files */}
      <div className="px-5">
        <FileUploader
          files={event?.files || []}
          onAddFile={handleAddFile}
          onRemoveFile={handleRemoveFile}
        />
      </div>

      {/* Related Events */}
      <RelatedEventsSection event={event} />
    </div>
  );
}
