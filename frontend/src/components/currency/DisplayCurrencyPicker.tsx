import { useTranslation } from 'react-i18next';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useDisplayCurrencyStore } from '@/store/displayCurrencyStore';
import { getCurrency } from '@/lib/format';
import { DisplayCurrencyIcon } from '@/components/ui/Icon';

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

  return (
    <label
      className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-pill bg-dn-surface-low text-xs text-dn-text-muted ${className}`}
      title={t('currencies.display.label')}
    >
      <DisplayCurrencyIcon className="text-sm" />
      <span className="sr-only">{t('currencies.display.label')}</span>
      <select
        value={displayCurrency ?? PER_CURRENCY_OPTION}
        onChange={(changeEvent) => setDisplayCurrency(changeEvent.target.value || null)}
        className="bg-transparent text-dn-text-main font-medium focus:outline-none cursor-pointer max-w-[14rem]"
      >
        <option value={PER_CURRENCY_OPTION}>{t('currencies.display.perCurrency')}</option>
        {principalCodes.map((code) => (
          <option key={code} value={code}>{t('currencies.display.principalOption', { code })}</option>
        ))}
        {[...otherCodes].sort().map((code) => (
          <option key={code} value={code}>{t('currencies.display.filteredOption', { code })}</option>
        ))}
      </select>
    </label>
  );
}
