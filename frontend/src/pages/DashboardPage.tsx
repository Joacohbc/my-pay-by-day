import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useDefaultTimePeriod } from '@/hooks/useDefaultTimePeriod';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { TimePeriodDashboard } from '@/components/time-periods/TimePeriodDashboard';
import { DynamicTimePeriodDashboard } from '@/components/time-periods/DynamicTimePeriodDashboard';
import { DynamicTimePeriodSelector, type DynamicPeriodOption } from '@/components/time-periods/DynamicTimePeriodSelector';
import { getDynamicPeriodDates } from '@/lib/dateUtils';
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
  const [dynamicPeriod, setDynamicPeriod] = useState<DynamicPeriodOption | null>(null);

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
  if (defaultId !== null && dynamicPeriod === null) {
    return (
      <>
        <div className="px-5 pt-4">
          <DynamicTimePeriodSelector
            value={'CUSTOM' as unknown as DynamicPeriodOption} // Or just manage a local state that defaults to the saved custom period
            onChange={(val) => setDynamicPeriod(val)}
          />
        </div>
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

  if (dynamicPeriod !== null) {
    const dates = getDynamicPeriodDates(dynamicPeriod);
    return (
      <>
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              className="text-xs text-dn-primary flex items-center gap-1"
              onClick={() => setDynamicPeriod(null)}
            >
              <Icon name="arrow_back" className="text-sm" /> {defaultId !== null ? t('periods.backToDefault', 'Back to Default') : t('common.back', 'Back')}
            </button>
          </div>
          <DynamicTimePeriodSelector
            value={dynamicPeriod}
            onChange={(val) => setDynamicPeriod(val)}
          />
        </div>
        <DynamicTimePeriodDashboard
          startDate={dates.startDate}
          endDate={dates.endDate}
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

      <div>
        <DynamicTimePeriodSelector
          value={dynamicPeriod as unknown as DynamicPeriodOption}
          onChange={(val) => setDynamicPeriod(val)}
        />
      </div>

      <Card>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-dn-primary/10 text-dn-primary">
            <Icon name="calendar_month" className="text-2xl" />
          </div>
          <div>
            <p className="text-base font-semibold text-dn-text-main">{t('dashboard.noDefaultPeriod')}</p>
            <p className="text-[13px] text-dn-text-muted mt-1 leading-relaxed px-2">
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
