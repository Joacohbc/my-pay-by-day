import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { eventsRoute, similarEventsRoute } from '@/lib/routes';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useEvent, useDeleteEvent, useUpdateEvent } from '@/hooks/useEvents';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatCurrency, formatDateTime, eventNetAmount } from '@/lib/format';
import { useState } from 'react';
import { RelatedEventsSection } from '@/components/events/RelatedEventsSection';
import { EventDuplicatesSection } from '@/components/events/EventDuplicatesSection';
import { CloneEventModal } from '@/components/events/CloneEventModal';
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

function EventDetailSkeleton({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <PageHeader title={t('events.detail')} back={onBack} />

      <div className="px-5 flex flex-col items-center text-center">
        <Skeleton className="w-16 h-16 rounded-full mb-4" />
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-8 w-28 mt-3" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-5 w-16 rounded-pill" />
          <Skeleton className="h-5 w-20 rounded-pill" />
        </div>
      </div>

      <div className="px-5">
        <Card className="divide-y divide-white/5">
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </Card>
      </div>

      <div className="px-5">
        <Skeleton className="h-3 w-24 mb-3" />
        <Card className="divide-y divide-white/5">
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        </Card>
      </div>

      <div className="px-5">
        <Skeleton className="h-3 w-16 mb-3" />
        <Skeleton className="h-16 w-full rounded-input" />
      </div>
    </div>
  );
}

export function EventDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { navigateBack, linkStateFromHere } = useAppNavigation();
  const goBack = () => navigateBack(eventsRoute());

  const { data: event, isLoading, error } = useEvent(Number(id));
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  if (isLoading) return <EventDetailSkeleton onBack={goBack} />;
  if (error || !event) return <ErrorState message={t('errors.eventNotFound')} />;

  const cfg = eventTypeConfig[event.type];
  const net = eventNetAmount(event);

  const confirmDelete = () => {
    goBack();
    deleteEvent.mutate(event.id);
  };

  const handleAddFiles = async (files: FileDto[]) => {
    if (!event) return;
    const currentFiles = event.files || [];
    const existingIds = new Set(currentFiles.map((f) => f.id));
    const newFiles = files.filter((f) => !existingIds.has(f.id)).map((f) => ({ ...f, isOrphan: false }));
    if (newFiles.length === 0) return;
    const nextFiles = [...currentFiles, ...newFiles];
    await updateEvent.mutateAsync({
      id: event.id,
      dto: { fileIds: nextFiles.map((f) => f.id) },
      optimisticFiles: nextFiles,
    });
  };

  const handleAddFile = (file: FileDto) => handleAddFiles([file]);

  const handleRemoveFiles = async (fileIds: number[]) => {
    if (!event) return;
    const idsToRemove = new Set(fileIds);
    const nextFiles = (event.files || []).filter((f) => !idsToRemove.has(f.id));
    await updateEvent.mutateAsync({
      id: event.id,
      dto: { fileIds: nextFiles.map((f) => f.id) },
      optimisticFiles: nextFiles,
    });
  };

  const handleRemoveFile = (fileId: number) => handleRemoveFiles([fileId]);

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

      <CloneEventModal
        open={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        event={event}
      />

      <PageHeader
        title={t('events.detail')}
        back={goBack}
        action={
          <div className="flex gap-2">
            <Link to={similarEventsRoute(event)} state={linkStateFromHere()}>
              <Button
                variant="secondary"
                size="sm"
                title={t('events.findSimilar')}
              >
                <Icon name="search" className="text-base" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              title={t('events.clone')}
              onClick={() => setIsCloneModalOpen(true)}
            >
              <Icon name="content_copy" className="text-base" />
            </Button>
            <Link to={`/events/${event.id}/edit`} state={linkStateFromHere()}>
              <Button variant="secondary" size="sm" title={t('common.edit')}>
                <Icon name="edit" className="text-base" />
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              title={t('common.delete')}
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
          onAddFiles={handleAddFiles}
          onRemoveFile={handleRemoveFile}
          onRemoveFiles={handleRemoveFiles}
        />
      </div>

      {/* Related Events */}
      <RelatedEventsSection event={event} />

      {/* Duplicates */}
      <EventDuplicatesSection event={event} />
    </div>
  );
}
