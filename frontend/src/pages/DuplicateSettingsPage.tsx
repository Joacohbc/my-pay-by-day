import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAlert } from '@/contexts/AlertContext';
import { Routes } from '@/lib/routes';
import {
  useDuplicateSettings,
  useUpdateDuplicateSettings,
  useScanAllDuplicates,
} from '@/services/duplicates.service';
import type { DuplicateDetectionSettings } from '@/models';

// Form state stores weights/thresholds as percentages (0–100) for display.
// Converted to/from 0–1 fractions when talking to the API.
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
  eventDateWeight: 10,
  eventAmountWeight: 30,
  eventNodeWeight: 30,
  eventCategoryWeight: 10,
  eventTagWeight: 10,
  eventNameWeight: 20,
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
    if (settings) setForm(toDisplay(settings));
  }, [settings]);

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: Number(value) }));

  const isPct = (key: keyof FormState) =>
    (PCT_FIELDS as string[]).includes(key);

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
    labelKey: string,
    opts?: { min?: number; max?: number; step?: number }
  ) => (
    <Input
      type="number"
      label={t(labelKey) + (isPct(key) ? ' (%)' : '')}
      hint={t(`${labelKey}Hint`, { defaultValue: '' }) || undefined}
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
        <Card className="space-y-4">
          {field('eventTimeThresholdMinutes', 'duplicates.settings.eventTimeThreshold', { min: 1 })}
          {field('eventDateWeight', 'duplicates.settings.eventDateWeight')}
          {field('eventAmountWeight', 'duplicates.settings.eventAmountWeight')}
          {field('eventNodeWeight', 'duplicates.settings.eventNodeWeight')}
          {field('eventCategoryWeight', 'duplicates.settings.eventCategoryWeight')}
          {field('eventTagWeight', 'duplicates.settings.eventTagWeight')}
          {field('eventNameWeight', 'duplicates.settings.eventNameWeight')}
          {field('eventTotalThresholdScore', 'duplicates.settings.totalThreshold')}
          {field('textSimilarityThresholdScore', 'duplicates.settings.textSimilarityThreshold')}
        </Card>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleScanAll}
            loading={scanAll.isPending}
            className="flex-1"
          >
            {t('duplicates.settings.scanAll')}
          </Button>
          <Button onClick={handleSave} loading={update.isPending} className="flex-1">
            {t('common.save')}
          </Button>
        </div>
      </section>
    </div>
  );
}
