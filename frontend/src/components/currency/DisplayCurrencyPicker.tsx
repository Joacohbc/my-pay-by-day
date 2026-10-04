import { useTranslation } from 'react-i18next';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useDisplayCurrencyStore } from '@/store/displayCurrencyStore';
import { getCurrency } from '@/lib/format';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

const PER_CURRENCY_OPTION = '';

interface DisplayCurrencyPickerProps {
  className?: string;
}

/**
 * Chooses the currency every balance and total reports in. The choice is global, so switching it
 * on one screen carries over to the others.
 */
export function DisplayCurrencyPicker({ className = '' }: DisplayCurrencyPickerProps) {
  const { t } = useTranslation();
  const { data: currencies } = useCurrencies();
  const displayCurrency = useDisplayCurrencyStore((state) => state.displayCurrency);
  const setDisplayCurrency = useDisplayCurrencyStore((state) => state.setDisplayCurrency);

  const principalCodes = (currencies ?? []).filter((currency) => currency.principal).map((currency) => currency.code);
  const otherCodes = new Set((currencies ?? []).filter((currency) => !currency.principal).map((currency) => currency.code));
  otherCodes.add(getCurrency());
  if (displayCurrency) otherCodes.add(displayCurrency);
  principalCodes.forEach((code) => otherCodes.delete(code));

  const options = [
    { value: PER_CURRENCY_OPTION, label: t('currencies.display.perCurrency') },
    ...principalCodes.map((code) => ({ value: code, label: t('currencies.display.principalOption', { code }) })),
    ...[...otherCodes].sort().map((code) => ({ value: code, label: t('currencies.display.filteredOption', { code }) })),
  ];

  return (
    <div className={`min-w-[200px] ${className}`} title={t('currencies.display.label')}>
      <SearchableSelect
        options={options}
        value={displayCurrency ?? PER_CURRENCY_OPTION}
        onChange={(selected) => setDisplayCurrency(selected ? String(selected) : null)}
      />
    </div>
  );
}
