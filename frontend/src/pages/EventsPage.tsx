import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
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
      const da = a.transaction?.transactionDate ?? '';
      const db = b.transaction?.transactionDate ?? '';
      return db.localeCompare(da);
    });

  const filterBtns: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Income', value: 'INBOUND' },
    { label: 'Expenses', value: 'OUTBOUND' },
    { label: 'Transfers', value: 'OTHER' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Events"
        subtitle={`${allEvents.length} total`}
        action={
          <Link to="/events/new">
            <Button size="sm">
              <Plus size={14} />
              New
            </Button>
          </Link>
        }
      />

      {/* Search */}
      <div className="px-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filterBtns.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={[
              'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer',
              filter === value
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
        {filter !== 'ALL' && (
          <Badge variant="indigo" className="items-center">
            <Filter size={10} className="mr-1" />
            Filtered
          </Badge>
        )}
      </div>

      {/* Event list */}
      <div className="px-4 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            title="No events found"
            description={search ? 'Try a different search term' : 'Create your first financial event'}
            action={
              <Link to="/events/new">
                <Button size="sm">
                  <Plus size={14} />
                  New Event
                </Button>
              </Link>
            }
          />
        ) : (
          filtered.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
