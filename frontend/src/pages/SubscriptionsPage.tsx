import { useState } from 'react';
import { useSubscriptions, useDeleteSubscription } from '@/hooks/useSubscriptions';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Subscription } from '@/models';

const recurrenceLabel: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

function SubscriptionCard({ sub }: { sub: Subscription }) {
  const del = useDeleteSubscription();
  const nextDate = new Date(sub.nextExecutionDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="flex items-center gap-4">
      <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-dn-primary/10 text-dn-primary shrink-0">
        <span className="material-symbols-outlined">sync</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-dn-text-main truncate">{sub.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="indigo">{recurrenceLabel[sub.recurrence]}</Badge>
          <span className="text-xs text-dn-text-muted flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">calendar_today</span>
            Next: {nextDate}
          </span>
        </div>
        {sub.template && (
          <p className="text-xs text-dn-text-muted mt-0.5">Template: {sub.template.name}</p>
        )}
      </div>
      <button
        onClick={() => del.mutate(sub.id)}
        disabled={del.isPending}
        className="shrink-0 p-2 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-lg">delete</span>
      </button>
    </Card>
  );
}

export function SubscriptionsPage() {
  const { data: subs, isLoading, error } = useSubscriptions();
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) return <FullPageSpinner />;

  const allSubs = subs ?? [];

  const isNotImplemented =
    error instanceof Error && error.message.includes('501');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring agreements"
        action={
          <Button size="sm" onClick={() => setShowInfo(true)}>
            <span className="material-symbols-outlined text-sm">add</span>
            New
          </Button>
        }
      />

      {/* Not-implemented banner */}
      {(error || isNotImplemented) && (
        <div className="mx-5 flex items-start gap-3 bg-dn-tertiary/10 border border-dn-tertiary/20 rounded-card px-4 py-3">
          <span className="material-symbols-outlined text-dn-tertiary shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-sm font-medium text-dn-tertiary">Feature coming soon</p>
            <p className="text-xs text-dn-text-muted mt-0.5">
              The subscriptions API is not yet implemented in the backend.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="px-5">
        <Card>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-dn-primary shrink-0 mt-0.5">sync</span>
            <div>
              <p className="text-sm font-semibold text-dn-text-main">How Subscriptions Work</p>
              <p className="text-xs text-dn-text-muted mt-1 leading-relaxed">
                Subscriptions are recurring agreements linked to a <span className="text-dn-text-main">Template</span>.
                When a billing cycle is reached, an Event is automatically generated using that Template.
                Use them for Netflix, rent, gym, salary, etc.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* List */}
      {allSubs.length === 0 && !error ? (
        <EmptyState
          icon={<span className="material-symbols-outlined text-2xl">sync</span>}
          title="No subscriptions yet"
          description="Set up recurring agreements to automate your financial tracking"
          action={
            <Button size="sm" onClick={() => setShowInfo(true)}>
              <span className="material-symbols-outlined text-sm">add</span>
              Add Subscription
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
        title="Create Subscription"
        footer={
          <Button variant="secondary" fullWidth onClick={() => setShowInfo(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3 text-sm text-dn-text-muted">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-dn-tertiary shrink-0 mt-0.5">info</span>
            <p>
              The subscriptions feature requires the backend to be fully implemented.
              Once available, you'll be able to select a Template, set a recurrence
              (Daily, Weekly, Monthly, Yearly), and define a next execution date.
            </p>
          </div>
          <p className="text-xs text-dn-text-muted">
            Templates define the default origin/destination nodes, category, tags, and
            optional amount modifiers (e.g. auto-add 10% tip).
          </p>
        </div>
      </Modal>
    </div>
  );
}
