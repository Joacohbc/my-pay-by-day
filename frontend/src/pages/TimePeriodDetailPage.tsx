import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TimePeriodDashboard } from '@/components/time-periods/TimePeriodDashboard';
import { useDefaultTimePeriod } from '@/hooks/useDefaultTimePeriod';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/ui/ErrorState';
import { Routes } from '@/lib/routes';

import { PageHeader } from '@/components/ui/PageHeader';

export function TimePeriodDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { defaultId, setDefaultId } = useDefaultTimePeriod();

  const numericId = id ? parseInt(id, 10) : NaN;

  if (isNaN(numericId)) {
    return <ErrorState message={t('periods.invalidId')} />;
  }

  const isDefault = defaultId === numericId;

  const handleToggleDefault = () => {
    setDefaultId(isDefault ? null : numericId);
  };

  return (
    <div>
      <PageHeader
        title={t('periods.detail')}
        back={Routes.PERIODS}
        action={
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleDefault}
            className={`flex items-center gap-1.5 ${isDefault ? 'text-dn-warning' : 'text-dn-text-muted'}`}
          >
            <Icon name={isDefault ? 'star' : 'star_border'} className="text-base" />
            {isDefault ? t('periods.homeDefault') : t('periods.setAsDefault')}
          </Button>
        }
      />
      <TimePeriodDashboard timePeriodId={numericId} />
    </div>
  );
}
