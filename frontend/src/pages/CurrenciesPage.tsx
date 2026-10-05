import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConvertingIcon, Icon } from '@/components/ui/Icon';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import { Skeleton } from '@/components/ui/Skeleton';
import { Routes } from '@/lib/routes';
import { formatDateTime, formatExchangeRate } from '@/lib/format';
import { parsePositiveNumber } from '@/lib/utils/numbers';
import { ConversionRecalculationSection } from '@/components/currency/ConversionRecalculationSection';
import { RefreshRatesPreviewModal } from '@/components/currency/RefreshRatesPreviewModal';
import { RefreshScheduleCard } from '@/components/currency/RefreshScheduleCard';
import {
  useCurrencies,
  useExchangeRateHistory,
  useMakeBaseCurrency,
  useRecordExchangeRate,
  useSetPrincipalCurrency,
} from '@/hooks/useCurrencies';
import type { CurrencySetting } from '@/models';

const HISTORY_LIMIT = 20;
const FALLBACK_BASE_CURRENCY = 'USD';

export function CurrenciesPage() {
  const { t } = useTranslation();
  const { data: currencies, isLoading } = useCurrencies();
  const baseCurrency = currencies?.find((currency) => currency.base)?.code ?? FALLBACK_BASE_CURRENCY;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={t('currencies.title')} back={Routes.SETTINGS} />

      <section className="px-5">
        <CurrencyRolesExplainer baseCurrency={baseCurrency} />
      </section>

      <section className="px-5">
        <SectionTitle>{t('currencies.principalSection')}</SectionTitle>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <CurrencyList currencies={currencies ?? []} />
        )}
      </section>

      <section className="px-5">
        <SectionTitle>{t('currencies.recordSection')}</SectionTitle>
        <RecordRateForm baseCurrency={baseCurrency} currencies={currencies ?? []} />
      </section>

      <section className="px-5">
        <SectionTitle>{t('currencies.schedule.section')}</SectionTitle>
        <RefreshScheduleCard />
      </section>

      <section className="px-5">
        <SectionTitle>{t('currencies.historySection')}</SectionTitle>
        <RateHistory />
      </section>

      {!isLoading && (
        <section className="px-5">
          <ConversionRecalculationSection currencies={currencies ?? []} />
        </section>
      )}
    </div>
  );
}

function CurrencyRolesExplainer({ baseCurrency }: { baseCurrency: string }) {
  const { t } = useTranslation();

  return (
    <Card className="space-y-3">
      <div className="space-y-1">
        <Badge variant="gray" size="sm">{t('currencies.base')}</Badge>
        <p className="text-xs text-dn-text-muted">{t('currencies.baseExplanation', { base: baseCurrency })}</p>
      </div>
      <div className="space-y-1">
        <Badge variant="indigo" size="sm">{t('currencies.principal')}</Badge>
        <p className="text-xs text-dn-text-muted">{t('currencies.principalExplanation')}</p>
      </div>
    </Card>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">{children}</p>;
}

function CurrencyList({ currencies }: { currencies: CurrencySetting[] }) {
  const { t } = useTranslation();
  const hasNothingConfigured = currencies.every((currency) => currency.base && !currency.principal);

  return (
    <div className="space-y-2">
      <Card padding={false} className="overflow-hidden divide-y divide-white/5">
        {currencies.map((currency) => (
          <CurrencyRow key={currency.code} currency={currency} />
        ))}
      </Card>
      {hasNothingConfigured && <p className="text-xs text-dn-text-muted">{t('currencies.empty')}</p>}
    </div>
  );
}

function CurrencyRow({ currency }: { currency: CurrencySetting }) {
  const { t } = useTranslation();
  const setPrincipal = useSetPrincipalCurrency();
  const makeBase = useMakeBaseCurrency();
  const currentRate = currency.currentRate;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold font-mono text-dn-text-main">{currency.code}</span>
          {currency.base && <Badge variant="gray" size="sm">{t('currencies.base')}</Badge>}
          {currency.principal && <Badge variant="indigo" size="sm">{t('currencies.principal')}</Badge>}
        </div>
        {!currency.base && (
          <p className="text-xs text-dn-text-muted">
            {currentRate
              ? `${t('currencies.rateLine', {
                  base: currentRate.baseCurrency,
                  rate: formatExchangeRate(currentRate.unitsPerBase),
                  currency: currency.code,
                })} · ${t(`currencies.rateSource.${currentRate.source}`)} · ${formatDateTime(currentRate.recordedAt)}`
              : t('currencies.noRate')}
          </p>
        )}
        {currency.conversionPending && (
          <p className="text-xs text-dn-warning flex items-center gap-1">
            <ConvertingIcon />
            {t('currencies.converting')}
          </p>
        )}
      </div>
      {!currency.base && (
        <Button
          size="sm"
          variant="ghost"
          loading={makeBase.isPending}
          onClick={() => makeBase.mutate(currency.code)}
          title={t('currencies.makeBaseHint')}
        >
          {t('currencies.makeBase')}
        </Button>
      )}
      <Button
        size="sm"
        variant={currency.principal ? 'ghost' : 'secondary'}
        loading={setPrincipal.isPending}
        onClick={() => setPrincipal.mutate({ code: currency.code, principal: !currency.principal })}
        title={currency.principal ? undefined : t('currencies.principalHint')}
      >
        {currency.principal ? t('currencies.removePrincipal') : t('currencies.makePrincipal')}
      </Button>
    </div>
  );
}

function RecordRateForm({ baseCurrency, currencies }: { baseCurrency: string; currencies: CurrencySetting[] }) {
  const { t } = useTranslation();
  const recordRate = useRecordExchangeRate();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currency, setCurrency] = useState('');
  const [unitsPerBase, setUnitsPerBase] = useState('');
  const [rateError, setRateError] = useState<string | undefined>();

  const handleSubmit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    const parsedRate = parsePositiveNumber(unitsPerBase);
    if (parsedRate === null) {
      setRateError(t('currencies.invalidRate'));
      return;
    }
    setRateError(undefined);
    recordRate.mutate(
      { currency, unitsPerBase: parsedRate },
      { onSuccess: () => setUnitsPerBase('') }
    );
  };

  const canSubmit = currency !== '' && currency !== baseCurrency && unitsPerBase !== '';

  return (
    <Card className="space-y-4">
      <p className="text-xs text-dn-text-muted">{t('currencies.recordHint', { base: baseCurrency })}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CurrencySelect label={t('currencies.currency')} value={currency} onChange={setCurrency} />
        <Input
          label={t('currencies.unitsPerBase', { base: baseCurrency })}
          inputMode="decimal"
          value={unitsPerBase}
          onChange={(changeEvent) => setUnitsPerBase(changeEvent.target.value)}
          error={rateError}
        />
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
          >
            <Icon name="cloud_sync" className="text-sm" />
            {t('currencies.refreshFromApi')}
          </Button>
          <Button type="submit" size="sm" loading={recordRate.isPending} disabled={!canSubmit}>
            {t('currencies.save')}
          </Button>
        </div>
      </form>
      <RefreshRatesPreviewModal open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} currencies={currencies} />
    </Card>
  );
}

function RateHistory() {
  const { t } = useTranslation();
  const { data: history, isLoading } = useExchangeRateHistory();

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!history?.length) {
    return (
      <Card>
        <p className="text-sm text-dn-text-muted">{t('currencies.historyEmpty')}</p>
      </Card>
    );
  }

  return (
    <Card padding={false} className="overflow-hidden divide-y divide-white/5">
      {history.slice(0, HISTORY_LIMIT).map((rate) => (
        <div key={rate.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-mono text-dn-text-main">
            {t('currencies.rateLine', {
              base: rate.baseCurrency,
              rate: formatExchangeRate(rate.unitsPerBase),
              currency: rate.currency,
            })}
          </span>
          <span className="text-xs text-dn-text-muted text-right">
            {t(`currencies.rateSource.${rate.source}`)} · {formatDateTime(rate.recordedAt)}
          </span>
        </div>
      ))}
    </Card>
  );
}
