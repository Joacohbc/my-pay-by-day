import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscriptions, useDeleteSubscription } from '@/hooks/useSubscriptions';
import { formatDateFromParts } from '@/lib/format';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import type { Subscription } from '@/models';

function SubscriptionCard({ sub }: { sub: Subscription }) {
  const { t } = useTranslation();
  const del = useDeleteSubscription();
  const nextDate = formatDateFromParts(sub.nextExecutionDate.slice(0, 10));

  return (
    <Card className="flex items-center gap-4">
      <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-dn-primary/10 text-dn-primary shrink-0">
        <Icon name="sync" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-dn-text-main truncate">{sub.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="indigo">{t(`subscriptions.recurrence.${sub.recurrence}`)}</Badge>
          <span className="text-xs text-dn-text-muted flex items-center gap-1">
            <Icon name="calendar_today" className="text-xs" />
            {t('subscriptions.next')}: {nextDate}
          </span>
        </div>
        {sub.template && (
          <p className="text-xs text-dn-text-muted mt-0.5">{t('events.template')}: {sub.template.name}</p>
        )}
      </div>
      <button
        onClick={() => del.mutate(sub.id)}
        disabled={del.isPending}
        className="shrink-0 p-2 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
      >
        <Icon name="delete" className="text-lg" />
      </button>
    </Card>
  );
}

export function SubscriptionsPage() {
  const { t } = useTranslation();
  const { data: subs, isLoading, error } = useSubscriptions();
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) return <FullPageSpinner />;

  const allSubs = subs ?? [];

  const isNotImplemented =
    error instanceof Error && error.message.includes('501');

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('subscriptions.title')}
        subtitle={t('subscriptions.subtitle')}
        action={
          <Button size="sm" onClick={() => setShowInfo(true)}>
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </Button>
        }
      />

      {/* Not-implemented banner */}
      {(error || isNotImplemented) && (
        <div className="mx-5 flex items-start gap-3 bg-dn-tertiary/10 border border-dn-tertiary/20 rounded-card px-4 py-3">
          <Icon name="info" className="text-dn-tertiary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-dn-tertiary">{t('subscriptions.featureComingSoon')}</p>
            <p className="text-xs text-dn-text-muted mt-0.5">
              {t('subscriptions.featureComingSoonDesc')}
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="px-5">
        <Card>
          <div className="flex items-start gap-3">
            <Icon name="sync" className="text-dn-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-dn-text-main">{t('subscriptions.howItWorks')}</p>
              <p className="text-xs text-dn-text-muted mt-1 leading-relaxed">
                {t('subscriptions.howItWorksDesc')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* List */}
      {allSubs.length === 0 && !error ? (
        <EmptyState
          icon={<Icon name="sync" className="text-2xl" />}
          title={t('subscriptions.noSubs')}
          description={t('subscriptions.noSubsDesc')}
          action={
            <Button size="sm" onClick={() => setShowInfo(true)}>
              <Icon name="add" className="text-sm" />
                {t('subscriptions.addSubscription')}
            </Button>
          }
        />
      ) : (
        <div className="px-5 space-y-3">
          {allSubs.map((sub) => (
            <SubscriptionCard key={sub.id} sub={sub} />
          ))}
        </div>
      )}

      {/* Info modal */}
      <Modal
        open={showInfo}
        onClose={() => setShowInfo(false)}
        title={t('subscriptions.createSubscription')}
        footer={
          <Button variant="secondary" fullWidth onClick={() => setShowInfo(false)}>
            {t('common.close')}
          </Button>
        }
      >
        <div className="space-y-3 text-sm text-dn-text-muted">
          <div className="flex items-start gap-2">
            <Icon name="info" className="text-dn-tertiary shrink-0 mt-0.5" />
            <p>
              {t('subscriptions.infoModalDesc')}
            </p>
          </div>
          <p className="text-xs text-dn-text-muted">
            {t('subscriptions.infoModalSubtext')}
          </p>
        </div>
      </Modal>
    </div>
  );
}
