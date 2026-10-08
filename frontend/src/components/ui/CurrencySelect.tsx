import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { currenciesList } from '@/lib/utils/currencies';

const currencyOptions = currenciesList.map(({ code, label }) => ({ value: code, label }));

interface CurrencySelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Offers "none", for a currency that is a preference rather than a requirement. */
  allowNone?: boolean;
  /** Shown while no currency is selected. */
  placeholder?: string;
  error?: string;
}

export function CurrencySelect({ label, value, onChange, allowNone, placeholder, error }: CurrencySelectProps) {
  return (
    <SearchableSelect
      label={label}
      options={currencyOptions}
      value={value}
      onChange={(selected) => onChange(selected == null ? '' : String(selected))}
      allowNone={allowNone}
      placeholder={placeholder}
      error={error}
    />
  );
}
