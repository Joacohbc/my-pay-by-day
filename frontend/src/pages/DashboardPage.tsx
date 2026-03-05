import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, ChevronRight, Plus } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useNodes } from '@/hooks/useNodes';
import { EventCard } from '@/components/events/EventCard';
import { Card } from '@/components/ui/Card';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { formatCurrency, eventNetAmount } from '@/lib/format';
import type { FinanceEvent } from '@/models';

function SummaryCard({
  label,
  amount,
  icon: Icon,
  colorClass,
}: {
  label: string;
  amount: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card className="flex-1">
      <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${colorClass} mb-3`}>
        <Icon size={16} />
      </div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className={`text-base font-bold tabular-nums ${colorClass.includes('emerald') ? 'text-emerald-400' : colorClass.includes('rose') ? 'text-rose-400' : 'text-zinc-100'}`}>
        {formatCurrency(amount)}
      </p>
    </Card>
  );
}

export function DashboardPage() {
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: nodes, isLoading: nodesLoading } = useNodes();

  if (eventsLoading || nodesLoading) return <FullPageSpinner />;

  const allEvents = events ?? [];
  const allNodes = nodes ?? [];

  // Current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthEvents = allEvents.filter((e) => {
    const d = e.transaction?.transactionDate;
    return d && new Date(d) >= monthStart;
  });

  const totalInbound = monthEvents
    .filter((e) => e.type === 'INBOUND')
    .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0);

  const totalOutbound = monthEvents
    .filter((e) => e.type === 'OUTBOUND')
    .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0);

  const ownNodes = allNodes.filter((n) => n.type === 'OWN' && !n.archived);
  const recentEvents: FinanceEvent[] = [...allEvents]
    .sort((a, b) => {
      const da = a.transaction?.transactionDate ?? '';
      const db = b.transaction?.transactionDate ?? '';
      return db.localeCompare(da);
    })
    .slice(0, 8);

  const today = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 px-4 pt-6">
      {/* Greeting */}
      <div>
        <p className="text-xs text-zinc-500 mb-0.5">{today}</p>
        <h1 className="text-2xl font-bold text-zinc-100">My Finances</h1>
      </div>

      {/* Month Summary */}
      <div className="flex gap-3">
        <SummaryCard
          label="Income"
          amount={totalInbound}
          icon={TrendingUp}
          colorClass="bg-emerald-950 text-emerald-400"
        />
        <SummaryCard
          label="Expenses"
          amount={totalOutbound}
          icon={TrendingDown}
          colorClass="bg-rose-950 text-rose-400"
        />
      </div>

      {/* Net balance this month */}
      <Card>
        <p className="text-xs text-zinc-500 mb-1">Net this month</p>
        <p
          className={`text-3xl font-bold tabular-nums ${
            totalInbound - totalOutbound >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {formatCurrency(totalInbound - totalOutbound)}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''} recorded
        </p>
      </Card>

      {/* Own Accounts */}
      {ownNodes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-300">Accounts</h2>
            <Link
              to="/nodes"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
            >
              All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {ownNodes.slice(0, 3).map((node) => (
              <Card key={node.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-950 text-indigo-400 shrink-0">
                  <Wallet size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">
                    {node.name}
                  </p>
                  <p className="text-xs text-zinc-500">Own account</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Recent Events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Recent Events</h2>
          <Link
            to="/events"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
          >
            All <ChevronRight size={12} />
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-500 text-center py-4">
              No events yet. Create your first one!
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-30">
        <Link to="/events/new">
          <Button size="lg" className="rounded-2xl shadow-lg shadow-indigo-900/40">
            <Plus size={20} />
            New Event
          </Button>
        </Link>
      </div>
    </div>
  );
}
