import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import type { FormValues } from '@/components/events/EventFormMapper';

export function TypeAndDateFields() {
  const { t } = useTranslation();
  const { control, register, formState: { errors } } = useFormContext<FormValues>();

  return (
    <div className="space-y-3">
      <Controller
        name="type"
        control={control}
        render={({ field }) => {
          const typeStyles = {
            OUTBOUND: {
              active: 'bg-dn-error/15 text-dn-error',
              inactive: 'text-dn-text-muted hover:text-dn-error',
            },
            INBOUND: {
              active: 'bg-dn-success/15 text-dn-success',
              inactive: 'text-dn-text-muted hover:text-dn-success',
            },
            OTHER: {
              active: 'bg-dn-info/15 text-dn-info',
              inactive: 'text-dn-text-muted hover:text-dn-info',
            },
          } as const;

          return (
            <div>
              <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">
                {t('eventForm.type')}
              </p>
              <div className="flex rounded-pill bg-dn-surface-low p-1 gap-1">
                {(['OUTBOUND', 'INBOUND', 'OTHER'] as const).map((opt) => {
                  const styles = typeStyles[opt];
                  const isActive = field.value === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => field.onChange(opt)}
                      className={[
                        'flex-1 py-2 rounded-pill text-sm font-semibold transition-all',
                        isActive ? styles.active : styles.inactive,
                      ].join(' ')}
                    >
                      {t(`eventType.${opt}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }}
      />

      <Input
        type="datetime-local"
        label={t('eventForm.dateTime')}
        error={errors.transactionDate?.message}
        {...register('transactionDate')}
      />
    </div>
  );
}
