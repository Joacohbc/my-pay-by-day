import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Routes } from '@/lib/routes';
import { EventCard } from '@/components/events/EventCard';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import type { FinanceEvent } from '@/models';

interface PeriodRecentActivityProps {
  recentEvents: FinanceEvent[];
  startDate: string;
  endDate: string;
}

export function PeriodRecentActivity({ recentEvents, startDate, endDate }: PeriodRecentActivityProps) {
  const { t } = useTranslation();

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-dn-text-muted uppercase tracking-wider">{t('periods.activity')}</h2>
        <Link
          to={`${Routes.EVENTS}?from=${startDate}&to=${endDate}`}
          className="text-xs text-dn-primary flex items-center gap-0.5"
        >
          {t('periods.viewAll')}
          <Icon name="chevron_right" className="text-sm" />
        </Link>
      </div>

      {recentEvents.length === 0 ? (
        <Card>
          <p className="text-sm text-dn-text-muted text-center py-4">{t('periods.noEventsInPeriod')}</p>
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
  );
}