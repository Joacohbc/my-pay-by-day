import { useTranslation } from 'react-i18next';

export type DynamicPeriodOption = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR';

interface Props {
  value: DynamicPeriodOption;
  onChange: (value: DynamicPeriodOption) => void;
}

export function DynamicTimePeriodSelector({ value, onChange }: Props) {
  const { t } = useTranslation();

  const options: { value: DynamicPeriodOption; label: string }[] = [
    { value: 'TODAY', label: t('periods.dynamic.today', 'Today') },
    { value: 'YESTERDAY', label: t('periods.dynamic.yesterday', 'Yesterday') },
    { value: 'THIS_WEEK', label: t('periods.dynamic.thisWeek', 'This Week') },
    { value: 'LAST_WEEK', label: t('periods.dynamic.lastWeek', 'Last Week') },
    { value: 'THIS_MONTH', label: t('periods.dynamic.thisMonth', 'This Month') },
    { value: 'LAST_MONTH', label: t('periods.dynamic.lastMonth', 'Last Month') },
    { value: 'THIS_YEAR', label: t('periods.dynamic.thisYear', 'This Year') },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`shrink-0 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors border ${
            value === opt.value
              ? 'bg-dn-primary/20 text-dn-primary border-dn-primary/30'
              : 'bg-dn-surface-low text-dn-text-muted border-transparent hover:text-dn-text-main'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
