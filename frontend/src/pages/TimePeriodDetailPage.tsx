import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TimePeriodDashboard } from '@/components/time-periods/TimePeriodDashboard';
import { useDefaultTimePeriod } from '@/hooks/useDefaultTimePeriod';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/ui/ErrorState';

export function TimePeriodDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
      <div className="flex items-center justify-between px-5 pt-5 gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-surface transition-colors shrink-0"
        >
          <Icon name="arrow_back" className="text-[18px]" />
        </button>
        <Button
          size="sm"
          variant={isDefault ? 'ghost' : 'ghost'}
          onClick={handleToggleDefault}
          className={`flex items-center gap-1.5 ${isDefault ? 'text-dn-warning' : 'text-dn-text-muted'}`}
        >
          <Icon name={isDefault ? 'star' : 'star_border'} className="text-base" />
          {isDefault ? t('periods.homeDefault') : t('periods.setAsDefault')}
        </Button>
      </div>
      <TimePeriodDashboard timePeriodId={numericId} />
    </div>
  );
}
