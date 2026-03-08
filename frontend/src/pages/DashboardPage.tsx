import { Link, useNavigate } from 'react-router-dom';
import { useDefaultTimePeriod } from '@/hooks/useDefaultTimePeriod';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { TimePeriodDashboard } from '@/components/time-periods/TimePeriodDashboard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';

export function DashboardPage() {
  const { defaultId } = useDefaultTimePeriod();
  const { data: periods, isLoading } = useTimePeriods();
  const navigate = useNavigate();

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  if (isLoading) return <FullPageSpinner />;

  // Default period is set — show its dashboard
  if (defaultId !== null) {
    return (
      <TimePeriodDashboard
        timePeriodId={defaultId}
        showGreeting
        onChangePeriod={() => navigate('/periods')}
      />
    );
  }

  // No default selected — onboarding / picker state
  const allPeriods = periods ?? [];

  return (
    <div className="space-y-6 px-5 pt-6">
      {/* Greeting */}
      <div>
        <p className="text-sm text-dn-text-muted">{greeting}</p>
        <h1 className="text-2xl font-semibold text-dn-text-main tracking-tight">My Finances</h1>
      </div>

      <Card>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="w-16 h-16 flex items-center justify-center rounded-3xl bg-dn-primary/10 text-dn-primary">
            <span className="material-symbols-outlined text-3xl">calendar_month</span>
          </div>
          <div>
            <p className="text-base font-semibold text-dn-text-main">No default period set</p>
            <p className="text-sm text-dn-text-muted mt-1 leading-relaxed">
              Choose a Time Period to track here on the Home tab. Your selection is saved locally.
            </p>
          </div>
          {allPeriods.length === 0 ? (
            <Link to="/periods">
              <Button size="sm">
                <span className="material-symbols-outlined text-sm">add</span>
                Create a Period
              </Button>
            </Link>
          ) : (
            <Link to="/periods">
              <Button size="sm">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                Select a Period
              </Button>
            </Link>
          )}
        </div>
      </Card>

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
