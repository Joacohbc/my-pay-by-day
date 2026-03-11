import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useDefaultTimePeriod } from '@/hooks/useDefaultTimePeriod';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { TimePeriodDashboard } from '@/components/time-periods/TimePeriodDashboard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import { TemplatePickerModal } from '@/components/events/TemplatePickerModal';
import type { Template } from '@/models';

export function DashboardPage() {
  const { t } = useTranslation();
  const { defaultId } = useDefaultTimePeriod();
  const { data: periods, isLoading } = useTimePeriods();
  const navigate = useNavigate();
  const [showPicker, setShowPicker] = useState(false);

  const handlePickTemplate = (template: Template | null) => {
    setShowPicker(false);
    if (template) {
      navigate('/events/new', { state: { template } });
    } else {
      navigate('/events/new');
    }
  };

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? t('greeting.morning') : now.getHours() < 18 ? t('greeting.afternoon') : t('greeting.evening');

  if (isLoading) return <FullPageSpinner />;

  // Default period is set — show its dashboard
  if (defaultId !== null) {
    return (
      <>
        <TimePeriodDashboard
          timePeriodId={defaultId}
          showGreeting
          onChangePeriod={() => navigate('/periods')}
          onNewEvent={() => setShowPicker(true)}
        />
        <TemplatePickerModal open={showPicker} onSelect={handlePickTemplate} onClose={() => setShowPicker(false)} />
      </>
    );
  }

  // No default selected — onboarding / picker state
  const allPeriods = periods?.content ?? [];

  return (
    <div className="space-y-6 px-5 pt-6">
      {/* Greeting */}
      <div>
        <p className="text-sm text-dn-text-muted">{greeting}</p>
        <h1 className="text-2xl font-semibold text-dn-text-main tracking-tight">{t('dashboard.myFinances')}</h1>
      </div>

      <Card>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="w-16 h-16 flex items-center justify-center rounded-3xl bg-dn-primary/10 text-dn-primary">
            <Icon name="calendar_month" className="text-3xl" />
          </div>
          <div>
            <p className="text-base font-semibold text-dn-text-main">{t('dashboard.noDefaultPeriod')}</p>
            <p className="text-sm text-dn-text-muted mt-1 leading-relaxed">
              {t('dashboard.noDefaultPeriodDesc')}
            </p>
          </div>
          {allPeriods.length === 0 ? (
            <Link to="/periods">
              <Button size="sm">
                <Icon name="add" className="text-sm" />
                {t('dashboard.createPeriod')}
              </Button>
            </Link>
          ) : (
            <Link to="/periods">
              <Button size="sm">
                <Icon name="calendar_month" className="text-sm" />
                {t('dashboard.selectPeriod')}
              </Button>
            </Link>
          )}
        </div>
      </Card>

      {/* FAB */}
      <div className="fixed bottom-24 right-5 z-30">
        <Button size="lg" className="rounded-pill shadow-lg shadow-dn-primary/20 gap-2" onClick={() => setShowPicker(true)}>
          <Icon name="add" />
          {t('dashboard.newEvent')}
        </Button>
      </div>

      <TemplatePickerModal open={showPicker} onSelect={handlePickTemplate} onClose={() => setShowPicker(false)} />
    </div>
  );
}
