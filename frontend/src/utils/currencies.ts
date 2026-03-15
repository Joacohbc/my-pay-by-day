export interface CurrencyOption {
  code: string;
  label: string;
}

export const getSupportedCurrencies = (): CurrencyOption[] => {
  try {
    const codes = Intl.supportedValuesOf('currency');
    return codes.map((code) => {
      let symbol = '$';
      try {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: code,
          currencyDisplay: 'symbol',
        });
        const parts = formatter.formatToParts(0);
        const currencyPart = parts.find((p) => p.type === 'currency');
        
        // Use the symbol if it's different from the code, otherwise default to '$'
        if (currencyPart && currencyPart.value && currencyPart.value !== code) {
          symbol = currencyPart.value;
        }
      } catch {
        // Keep default '$' if error
      }
      
      return {
        code,
        label: `${code} (${symbol})`,
      };
    });
  } catch {
    // Fallback if Intl.supportedValuesOf is not supported
    return ['USD', 'EUR', 'GBP', 'ARS', 'MXN', 'COP', 'CLP', 'PEN', 'BRL', 'UYU', 'JPY'].map(
      (code) => ({
        code,
        label: `${code} ($)`,
      })
    );
  }
};

export const currenciesList = getSupportedCurrencies();
