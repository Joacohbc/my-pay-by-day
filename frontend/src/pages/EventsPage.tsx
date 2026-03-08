import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, eventNetAmount } from '@/lib/format';
import type { EventType } from '@/models';

type FilterType = 'ALL' | EventType;

export function EventsPage() {
  const { data: events, isLoading, error } = useEvents();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allEvents = events ?? [];

  const filtered = allEvents
    .filter((e) => {
      if (filter !== 'ALL' && e.type !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.category?.name.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const da = a.transactionDate ?? '';
      const db = b.transactionDate ?? '';
      return db.localeCompare(da);
    });

  // Summary stats
  const totalIncome = allEvents
    .filter((e) => e.type === 'INBOUND')
    .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0);
  const totalExpenses = allEvents
    .filter((e) => e.type === 'OUTBOUND')
    .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0);

  const filterBtns: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Income', value: 'INBOUND' },
    { label: 'Expenses', value: 'OUTBOUND' },
    { label: 'Transfers', value: 'OTHER' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity"
        subtitle={`${allEvents.length} events`}
        action={
          <Link to="/events/new">
            <Button size="sm">
              <span className="material-symbols-outlined text-sm">add</span>
              New
            </Button>
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 px-5">
        <Card className="text-center">
          <p className="text-xs text-dn-text-muted mb-1">Income</p>
          <p className="text-lg font-mono font-semibold text-dn-success">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-dn-text-muted mb-1">Expenses</p>
          <p className="text-lg font-mono font-semibold text-dn-text-main">{formatCurrency(totalExpenses)}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="px-5">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-xl">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full bg-dn-surface-low rounded-input pl-10 pr-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filterBtns.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={[
              'shrink-0 px-4 py-1.5 rounded-pill text-xs font-medium transition-all cursor-pointer',
              filter === value
                ? 'bg-dn-primary/20 text-dn-primary'
                : 'bg-dn-surface-low text-dn-text-muted hover:bg-dn-surface',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="px-5">
        {filtered.length === 0 ? (
          <EmptyState
            title="No events found"
            description={search ? 'Try a different search term' : 'Create your first financial event'}
            action={
              <Link to="/events/new">
                <Button size="sm">
                  <span className="material-symbols-outlined text-sm">add</span>
                  New Event
                </Button>
              </Link>
            }
          />
        ) : (
          <Card className="divide-y divide-white/5">
            {filtered.map((event) => (
              <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                <EventCard event={event} />
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
