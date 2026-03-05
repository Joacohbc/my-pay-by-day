import { useState } from 'react';
import {
  Plus,
  RefreshCcw,
  Calendar,
  Trash2,
  AlertCircle,
} from 'lucide-react';
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
    <Card className="flex items-center gap-3">
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-950 text-indigo-400 shrink-0">
        <RefreshCcw size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100 truncate">{sub.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="indigo">{recurrenceLabel[sub.recurrence]}</Badge>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Calendar size={10} />
            Next: {nextDate}
          </div>
        </div>
        {sub.template && (
          <p className="text-xs text-zinc-600 mt-0.5">Template: {sub.template.name}</p>
        )}
      </div>
      <button
        onClick={() => del.mutate(sub.id)}
        disabled={del.isPending}
        className="shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
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
            <Plus size={14} />
            New
          </Button>
        }
      />

      {/* Not-implemented banner */}
      {(error || isNotImplemented) && (
        <div className="mx-4 flex items-start gap-3 bg-amber-950/50 border border-amber-800 rounded-2xl px-4 py-3">
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Feature coming soon</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              The subscriptions API is not yet implemented in the backend.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="px-4">
        <Card className="bg-zinc-900/50">
          <div className="flex items-start gap-3">
            <RefreshCcw size={18} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-zinc-200">How Subscriptions Work</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Subscriptions are recurring agreements linked to a <span className="text-zinc-300">Template</span>.
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
          icon={<RefreshCcw size={22} />}
          title="No subscriptions yet"
          description="Set up recurring agreements to automate your financial tracking"
          action={
            <Button size="sm" onClick={() => setShowInfo(true)}>
              <Plus size={14} />
              Add Subscription
            </Button>
          }
        />
      ) : (
        <div className="px-4 space-y-2">
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
        <div className="space-y-3 text-sm text-zinc-400">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <p>
              The subscriptions feature requires the backend to be fully implemented.
              Once available, you'll be able to select a Template, set a recurrence
              (Daily, Weekly, Monthly, Yearly), and define a next execution date.
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            Templates define the default origin/destination nodes, category, tags, and
            optional amount modifiers (e.g. auto-add 10% tip).
          </p>
        </div>
      </Modal>
    </div>
  );
}
