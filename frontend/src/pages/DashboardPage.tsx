import { Link } from 'react-router-dom';
import { useEvents } from '@/hooks/useEvents';
import { useNodes } from '@/hooks/useNodes';
import { EventCard } from '@/components/events/EventCard';
import { Card } from '@/components/ui/Card';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { formatCurrency, eventNetAmount } from '@/lib/format';
import type { FinanceEvent } from '@/models';

export function DashboardPage() {
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: nodes, isLoading: nodesLoading } = useNodes();

  if (eventsLoading || nodesLoading) return <FullPageSpinner />;

  const allEvents = events ?? [];
  const allNodes = nodes ?? [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthEvents = allEvents.filter((e) => {
    const d = e.transactionDate;
    return d && new Date(d) >= monthStart;
  });

  const totalInbound = monthEvents
    .filter((e) => e.type === 'INBOUND')
    .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0);

  const totalOutbound = monthEvents
    .filter((e) => e.type === 'OUTBOUND')
    .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0);

  const netBalance = totalInbound - totalOutbound;

  const ownNodes = allNodes.filter((n) => n.type === 'OWN' && !n.archived);
  const recentEvents: FinanceEvent[] = [...allEvents]
    .sort((a, b) => {
      const da = a.transactionDate ?? '';
      const db = b.transactionDate ?? '';
      return db.localeCompare(da);
    })
    .slice(0, 8);

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 px-5 pt-6">
      {/* Greeting */}
      <div>
        <p className="text-sm text-dn-text-muted">{greeting}</p>
        <h1 className="text-2xl font-semibold text-dn-text-main tracking-tight">My Finances</h1>
      </div>

      {/* Balance Card */}
      <Card className="relative overflow-hidden">
        <p className="text-xs text-dn-text-muted uppercase tracking-wider mb-1">
          Net Balance · {monthLabel}
        </p>
        <p className={`text-4xl font-mono font-bold tracking-tight ${netBalance >= 0 ? 'text-dn-success' : 'text-dn-error'}`}>
          {formatCurrency(netBalance)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-medium ${netBalance >= 0 ? 'bg-dn-success/10 text-dn-success' : 'bg-dn-error/10 text-dn-error'}`}>
            <span className="material-symbols-outlined text-sm">{netBalance >= 0 ? 'trending_up' : 'trending_down'}</span>
            {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>

      {/* Income / Expense Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-success/10 text-dn-success mb-3">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <p className="text-xs text-dn-text-muted mb-0.5">Income</p>
          <p className="text-lg font-mono font-semibold text-dn-success">{formatCurrency(totalInbound)}</p>
        </Card>
        <Card>
          <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-error/10 text-dn-error mb-3">
            <span className="material-symbols-outlined">trending_down</span>
          </div>
          <p className="text-xs text-dn-text-muted mb-0.5">Expenses</p>
          <p className="text-lg font-mono font-semibold text-dn-text-main">{formatCurrency(totalOutbound)}</p>
        </Card>
      </div>

      {/* Own Accounts */}
      {ownNodes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-dn-text-muted uppercase tracking-wider">Accounts</h2>
            <Link to="/nodes" className="text-xs text-dn-primary flex items-center gap-0.5">
              View all
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>
          <Card className="divide-y divide-white/5">
            {ownNodes.slice(0, 3).map((node) => (
              <div key={node.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-primary/10 text-dn-primary shrink-0">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dn-text-main truncate">{node.name}</p>
                  <p className="text-xs text-dn-text-muted">Own account</p>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-dn-text-muted uppercase tracking-wider">Recent Activity</h2>
          <Link to="/events" className="text-xs text-dn-primary flex items-center gap-0.5">
            View all
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <Card>
            <p className="text-sm text-dn-text-muted text-center py-4">
              No events yet. Create your first one!
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-white/5">
            {recentEvents.map((event) => (
              <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                <EventCard event={event} />
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* FAB */}
      <div className="fixed bottom-24 right-5 z-30">
        <Link to="/events/new">
          <Button size="lg" className="rounded-pill shadow-lg shadow-dn-primary/20 gap-2">
            <span className="material-symbols-outlined">add</span>
            New Event
          </Button>
        </Link>
      </div>
    </div>
  );
}
