import { useTranslation } from 'react-i18next';
import { useCurrencies } from '@/hooks/useCurrencies';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import { currenciesList } from '@/lib/utils/currencies';

const currencyLabelByCode = new Map(currenciesList.map(({ code, label }) => [code, label]));

interface QuotedCurrencyPickerProps {
  value: string;
  onChange: (currencyCode: string) => void;
  error?: string;
}

/**
 * Offers only the currencies set up in Settings → Currencies, the ones that have exchange rates,
 * as pills. A stored currency outside that set still shows, so editing never hides what was saved;
 * with no currency set up at all it falls back to the full list.
 */
export function QuotedCurrencyPicker({ value, onChange, error }: QuotedCurrencyPickerProps) {
  const { t } = useTranslation();
  const { data: currencySettings = [], isLoading } = useCurrencies();

  if (!isLoading && currencySettings.length === 0) {
    return (
      <CurrencySelect
        label={t('eventForm.currency')}
        placeholder={t('common.noCurrency')}
        value={value}
        onChange={onChange}
        error={error}
      />
    );
  }

  const quotedCodes = currencySettings.map((setting) => setting.code);
  const isStoredOutsideQuoted = value !== '' && !quotedCodes.includes(value);
  const offeredCodes = isStoredOutsideQuoted ? [value, ...quotedCodes] : quotedCodes;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
        {t('eventForm.currency')}
      </span>
      <div className="flex flex-wrap gap-2">
        {offeredCodes.map((code) => {
          const isSelected = code === value;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(code)}
              className={[
                'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer',
                isSelected
                  ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                  : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
              ].join(' ')}
            >
              {currencyLabelByCode.get(code) ?? code}
            </button>
          );
        })}
      </div>
      {value === '' && !error && <span className="text-xs text-dn-text-muted">{t('common.noCurrency')}</span>}
      {error && <span className="text-xs text-dn-error">{error}</span>}
    </div>
  );
}
