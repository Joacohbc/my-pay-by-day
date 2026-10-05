import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatExchangeRate } from '@/lib/format';
import { useProviderQuotesPreview, useRefreshExchangeRates } from '@/hooks/useCurrencies';
import type { CurrencySetting, ProviderQuote } from '@/models';

interface RefreshRatesPreviewModalProps {
  open: boolean;
  onClose: () => void;
  currencies: CurrencySetting[];
}

/** Shows what the provider quotes right now, and records it only once the user confirms. */
export function RefreshRatesPreviewModal({ open, onClose, currencies }: RefreshRatesPreviewModalProps) {
  const { t } = useTranslation();
  const { data: quotes, isLoading, error } = useProviderQuotesPreview(open);
  const refreshRates = useRefreshExchangeRates();
  const hasQuotes = (quotes?.length ?? 0) > 0;

  const handleConfirm = () => refreshRates.mutate(undefined, { onSuccess: onClose });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('currencies.preview.title')}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={refreshRates.isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} loading={refreshRates.isPending} disabled={!hasQuotes}>
            {t('currencies.preview.confirm')}
          </Button>
        </div>
      }
    >
      <PreviewBody
        quotes={quotes}
        isLoading={isLoading}
        errorMessage={error instanceof Error ? error.message : undefined}
        currencies={currencies}
      />
    </Modal>
  );
}

interface PreviewBodyProps {
  quotes: ProviderQuote[] | undefined;
  isLoading: boolean;
  errorMessage: string | undefined;
  currencies: CurrencySetting[];
}

function PreviewBody({ quotes, isLoading, errorMessage, currencies }: PreviewBodyProps) {
  const { t } = useTranslation();

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (errorMessage) return <p className="text-sm text-dn-error">{errorMessage}</p>;
  if (!quotes?.length) return <p className="text-sm text-dn-text-muted">{t('currencies.preview.empty')}</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-dn-text-muted">{t('currencies.preview.hint', { source: quotes[0].source })}</p>
      <div className="divide-y divide-white/5">
        {quotes.map((quote) => (
          <QuoteRow
            key={quote.currency}
            quote={quote}
            currentUnitsPerBase={currencies.find((currency) => currency.code === quote.currency)?.currentRate?.unitsPerBase}
          />
        ))}
      </div>
    </div>
  );
}

function QuoteRow({ quote, currentUnitsPerBase }: { quote: ProviderQuote; currentUnitsPerBase: number | undefined }) {
  const { t } = useTranslation();
  const baseUnitsPerQuoted = 1 / quote.unitsPerBase;

  return (
    <div className="py-2 space-y-0.5">
      <p className="text-sm font-mono text-dn-text-main">
        {t('currencies.rateLine', { base: quote.currency, rate: formatExchangeRate(baseUnitsPerQuoted), currency: quote.baseCurrency })}
      </p>
      <p className="text-xs font-mono text-dn-text-muted">
        {t('currencies.rateLine', { base: quote.baseCurrency, rate: formatExchangeRate(quote.unitsPerBase), currency: quote.currency })}
      </p>
      <p className="text-xs text-dn-text-muted">
        {currentUnitsPerBase === undefined
          ? t('currencies.preview.noCurrentRate')
          : t('currencies.preview.currentRate', {
              line: t('currencies.rateLine', { base: quote.currency, rate: formatExchangeRate(1 / currentUnitsPerBase), currency: quote.baseCurrency }),
            })}
      </p>
    </div>
  );
}
