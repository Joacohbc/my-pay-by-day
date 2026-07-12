import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useAlert } from '@/contexts/AlertContext';
import { Routes } from '@/lib/routes';
import {
  useDuplicateSettings,
  useUpdateDuplicateSettings,
  useScanAllDuplicates,
} from '@/hooks/useDuplicates';
import type { DuplicateDetectionSettings } from '@/models';

// Form state stores weights/thresholds as percentages (0-100) for display.
// Converted to/from 0-1 fractions when talking to the API.
type FormState = {
  eventTimeThresholdMinutes: number;
  eventDateWeight: number;
  eventAmountWeight: number;
  eventNodeWeight: number;
  eventCategoryWeight: number;
  eventTagWeight: number;
  eventNameWeight: number;
  eventTotalThresholdScore: number;
  textSimilarityThresholdScore: number;
};

const WEIGHT_FIELDS: (keyof FormState)[] = [
  'eventDateWeight',
  'eventAmountWeight',
  'eventNodeWeight',
  'eventCategoryWeight',
  'eventTagWeight',
  'eventNameWeight',
];

const PCT_FIELDS: (keyof Omit<FormState, 'eventTimeThresholdMinutes'>)[] = [
  'eventDateWeight',
  'eventAmountWeight',
  'eventNodeWeight',
  'eventCategoryWeight',
  'eventTagWeight',
  'eventNameWeight',
  'eventTotalThresholdScore',
  'textSimilarityThresholdScore',
];

function toDisplay(s: DuplicateDetectionSettings): FormState {
  return {
    eventTimeThresholdMinutes: s.eventTimeThresholdMinutes,
    eventDateWeight: Math.round(s.eventDateWeight * 100),
    eventAmountWeight: Math.round(s.eventAmountWeight * 100),
    eventNodeWeight: Math.round(s.eventNodeWeight * 100),
    eventCategoryWeight: Math.round(s.eventCategoryWeight * 100),
    eventTagWeight: Math.round(s.eventTagWeight * 100),
    eventNameWeight: Math.round(s.eventNameWeight * 100),
    eventTotalThresholdScore: Math.round(s.eventTotalThresholdScore * 100),
    textSimilarityThresholdScore: Math.round(s.textSimilarityThresholdScore * 100),
  };
}

function toApi(f: FormState): Omit<DuplicateDetectionSettings, 'id'> {
  return {
    eventTimeThresholdMinutes: f.eventTimeThresholdMinutes,
    eventDateWeight: f.eventDateWeight / 100,
    eventAmountWeight: f.eventAmountWeight / 100,
    eventNodeWeight: f.eventNodeWeight / 100,
    eventCategoryWeight: f.eventCategoryWeight / 100,
    eventTagWeight: f.eventTagWeight / 100,
    eventNameWeight: f.eventNameWeight / 100,
    eventTotalThresholdScore: f.eventTotalThresholdScore / 100,
    textSimilarityThresholdScore: f.textSimilarityThresholdScore / 100,
  };
}

const DEFAULT: FormState = {
  eventTimeThresholdMinutes: 60,
  eventDateWeight: 60,
  eventAmountWeight: 30,
  eventNodeWeight: 2,
  eventCategoryWeight: 2,
  eventTagWeight: 2,
  eventNameWeight: 4,
  eventTotalThresholdScore: 80,
  textSimilarityThresholdScore: 85,
};

export function DuplicateSettingsPage() {
  const { t } = useTranslation();
  const alert = useAlert();
  const { data: settings } = useDuplicateSettings();
  const update = useUpdateDuplicateSettings();
  const scanAll = useScanAllDuplicates();
  const [form, setForm] = useState<FormState>(DEFAULT);

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(toDisplay(settings));
    }
  }, [settings]);

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: Number(value) }));

  const isPct = (key: keyof FormState) =>
    (PCT_FIELDS as string[]).includes(key);

  const weightSum = WEIGHT_FIELDS.reduce((acc, key) => acc + (form[key] as number), 0);
  const weightsValid = weightSum === 100;
  const weightMessage = t('duplicates.settings.weightsSum', { sum: weightSum });

  const handleSave = () => {
    update.mutate(toApi(form), {
      onSuccess: () => alert.success(t('duplicates.settings.saved')),
      onError: () => alert.error(t('common.error')),
    });
  };

  const handleScanAll = () => {
    scanAll.mutate(undefined, {
      onSuccess: () => alert.info(t('duplicates.settings.scanAllSuccess')),
      onError: () => alert.error(t('common.error')),
    });
  };

  const field = (
    key: keyof FormState,
    label: string,
    hint?: string,
    opts?: { min?: number; max?: number; step?: number }
  ) => (
    <Input
      type="number"
      label={label + (isPct(key) ? ' (%)' : '')}
      hint={hint}
      value={form[key]}
      min={opts?.min ?? 0}
      max={opts?.max ?? (isPct(key) ? 100 : undefined)}
      step={opts?.step ?? (isPct(key) ? 1 : 1)}
      onChange={(e) => set(key, e.target.value)}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t('duplicates.settings.title')} back={Routes.SETTINGS} />

      <section className="px-5 space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-300">
          <Icon name="info" className="mt-0.5" />
          <p>{t('duplicates.settings.gatingLogicInfo')}</p>
        </div>

        <Card className="space-y-4">
          {field(
            'eventTimeThresholdMinutes',
            t('duplicates.settings.eventTimeThreshold'),
            t('duplicates.settings.eventTimeThresholdHint'),
            { min: 1 }
          )}
          {field(
            'eventTotalThresholdScore',
            t('duplicates.settings.totalThreshold'),
            t('duplicates.settings.totalThresholdHint')
          )}
          {field(
            'textSimilarityThresholdScore',
            t('duplicates.settings.textSimilarityThreshold'),
            t('duplicates.settings.textSimilarityThresholdHint')
          )}
        </Card>

        <details className="group rounded-2xl border bg-dn-panel overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between p-4 font-medium select-none focus:outline-none">
            <div>
              <div className="text-sm font-semibold">{t('duplicates.settings.advancedSettings')}</div>
              <div className="text-xs text-dn-text-muted mt-0.5">{t('duplicates.settings.advancedSettingsDesc')}</div>
            </div>
            <Icon name="expand_more" className="transition-transform group-open:-rotate-180" />
          </summary>
          <div className="border-t border-border/50 p-4 space-y-4 bg-dn-background/50">
            {field(
              'eventDateWeight',
              t('duplicates.settings.eventDateWeight'),
              t('duplicates.settings.eventDateWeightHint')
            )}
            {field(
              'eventAmountWeight',
              t('duplicates.settings.eventAmountWeight'),
              t('duplicates.settings.eventAmountWeightHint')
            )}
            {field(
              'eventNodeWeight',
              t('duplicates.settings.eventNodeWeight'),
              t('duplicates.settings.eventNodeWeightHint')
            )}
            {field(
              'eventCategoryWeight',
              t('duplicates.settings.eventCategoryWeight'),
              t('duplicates.settings.eventCategoryWeightHint')
            )}
            {field(
              'eventTagWeight',
              t('duplicates.settings.eventTagWeight'),
              t('duplicates.settings.eventTagWeightHint')
            )}
            {field(
              'eventNameWeight',
              t('duplicates.settings.eventNameWeight'),
              t('duplicates.settings.eventNameWeightHint')
            )}
            
            <div
              className={[
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium',
                weightsValid
                  ? 'border-dn-success/30 bg-dn-success/10 text-dn-success'
                  : 'border-dn-error/30 bg-dn-error/10 text-dn-error',
              ].join(' ')}
            >
              <Icon name={weightsValid ? 'check_circle' : 'error'} className="text-base" />
              <span>
                {weightsValid
                  ? weightMessage
                  : `${t('duplicates.settings.weightsSumError')} (${weightMessage})`}
              </span>
            </div>
          </div>
        </details>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleScanAll}
            loading={scanAll.isPending}
            className="flex-1"
          >
            {t('duplicates.settings.scanAll')}
          </Button>
          <Button onClick={handleSave} loading={update.isPending} className="flex-1" disabled={!weightsValid}>
            {t('common.save')}
          </Button>
        </div>
      </section>
    </div>
  );
}
