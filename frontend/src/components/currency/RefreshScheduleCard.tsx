import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateFromParts } from '@/lib/format';
import { useExchangeRateRefreshSchedule, useUpdateExchangeRateRefreshSchedule } from '@/hooks/useCurrencies';
import type { ExchangeRateRefreshSchedule } from '@/models';

/** The server sends "HH:mm:ss"; a time input works in "HH:mm". */
const HOURS_AND_MINUTES_LENGTH = 5;

/** Whether, and at what time of day, the provider's quotes are recorded on their own. */
export function RefreshScheduleCard() {
  const { data: schedule, isLoading } = useExchangeRateRefreshSchedule();

  if (isLoading || !schedule) return <Skeleton className="h-32 w-full" />;
  const savedScheduleKey = `${schedule.enabled}-${schedule.refreshTime}-${schedule.businessDaysOnly}`;
  return <RefreshScheduleForm key={savedScheduleKey} schedule={schedule} />;
}

function RefreshScheduleForm({ schedule }: { schedule: ExchangeRateRefreshSchedule }) {
  const { t } = useTranslation();
  const updateSchedule = useUpdateExchangeRateRefreshSchedule();
  const [isEnabled, setIsEnabled] = useState(schedule.enabled);
  const [refreshTime, setRefreshTime] = useState(schedule.refreshTime.slice(0, HOURS_AND_MINUTES_LENGTH));
  const [isBusinessDaysOnly, setIsBusinessDaysOnly] = useState(schedule.businessDaysOnly);

  const hasChanges =
    isEnabled !== schedule.enabled ||
    refreshTime !== schedule.refreshTime.slice(0, HOURS_AND_MINUTES_LENGTH) ||
    isBusinessDaysOnly !== schedule.businessDaysOnly;

  const handleSave = () =>
    updateSchedule.mutate({ enabled: isEnabled, refreshTime, businessDaysOnly: isBusinessDaysOnly });

  return (
    <Card className="space-y-4">
      <p className="text-xs text-dn-text-muted">{t('currencies.schedule.hint')}</p>
      <CheckboxRow label={t('currencies.schedule.enabled')} checked={isEnabled} onChange={setIsEnabled} />
      <Input
        label={t('currencies.schedule.time', { timeZone: schedule.timeZone })}
        type="time"
        value={refreshTime}
        onChange={(changeEvent) => setRefreshTime(changeEvent.target.value)}
        disabled={!isEnabled}
      />
      <CheckboxRow
        label={t('currencies.schedule.businessDaysOnly')}
        checked={isBusinessDaysOnly}
        onChange={setIsBusinessDaysOnly}
        disabled={!isEnabled}
      />
      <LastRunStatus schedule={schedule} />
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} loading={updateSchedule.isPending} disabled={!hasChanges || refreshTime === ''}>
          {t('currencies.schedule.save')}
        </Button>
      </div>
    </Card>
  );
}

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function CheckboxRow({ label, checked, onChange, disabled }: CheckboxRowProps) {
  return (
    <label className="flex items-center gap-3 bg-dn-surface-low rounded-input px-4 py-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(changeEvent) => onChange(changeEvent.target.checked)}
        className="w-4 h-4 shrink-0 accent-dn-primary bg-dn-surface-low"
      />
      <span className="text-sm text-dn-text-main">{label}</span>
    </label>
  );
}

function LastRunStatus({ schedule }: { schedule: ExchangeRateRefreshSchedule }) {
  const { t } = useTranslation();

  if (!schedule.lastAttemptOn) {
    return <p className="text-xs text-dn-text-muted">{t('currencies.schedule.neverRan')}</p>;
  }
  const lastRunDate = formatDateFromParts(schedule.lastAttemptOn);
  if (schedule.lastFailure) {
    return (
      <p className="text-xs text-dn-error">
        {t('currencies.schedule.lastFailed', { date: lastRunDate, reason: schedule.lastFailure })}
      </p>
    );
  }
  return <p className="text-xs text-dn-text-muted">{t('currencies.schedule.lastSucceeded', { date: lastRunDate })}</p>;
}
