import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConvertingIcon, Icon } from '@/components/ui/Icon';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, formatDateFromParts, formatDateTime, formatExchangeRate } from '@/lib/format';
import { parsePositiveNumber } from '@/lib/utils/numbers';
import { useConversionRecalculations, useRequestConversionRecalculation } from '@/hooks/useCurrencies';
import type { ConversionRecalculation, CurrencySetting, RequestConversionRecalculationDto } from '@/models';

const START_OF_DAY = 'T00:00:00';
const END_OF_DAY = 'T23:59:59';

function toRangeBoundary(dateOnly: string, timeOfDay: string): string | null {
  return dateOnly ? `${dateOnly}${timeOfDay}` : null;
}

export function ConversionRecalculationSection({ currencies }: { currencies: CurrencySetting[] }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>{t('currencies.recalculation.section')}</SectionTitle>
        <RecalculationForm currencies={currencies} />
      </section>
      <RecalculationHistory />
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">{children}</p>;
}

function useRangeDescription() {
  const { t } = useTranslation();
  return (startDate: string, endDate: string) => {
    const start = formatDateFromParts(startDate);
    const end = formatDateFromParts(endDate);
    if (startDate && endDate) return t('currencies.recalculation.rangeBetween', { start, end });
    if (startDate) return t('currencies.recalculation.rangeFrom', { start });
    if (endDate) return t('currencies.recalculation.rangeUntil', { end });
    return t('currencies.recalculation.rangeAll');
  };
}

function RecalculationForm({ currencies }: { currencies: CurrencySetting[] }) {
  const { t } = useTranslation();
  const requestRecalculation = useRequestConversionRecalculation();
  const describeRange = useRangeDescription();
  const [sourceCurrency, setSourceCurrency] = useState('');
  const [targetCurrency, setTargetCurrency] = useState('');
  const [rate, setRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rateError, setRateError] = useState<string | undefined>();
  const [pendingRequest, setPendingRequest] = useState<RequestConversionRecalculationDto | null>(null);

  const principalOptions = currencies
    .filter((currency) => currency.principal)
    .map((currency) => ({ value: currency.code, label: currency.code }));

  if (principalOptions.length === 0) {
    return (
      <Card>
        <p className="text-sm text-dn-text-muted">{t('currencies.recalculation.noPrincipal')}</p>
      </Card>
    );
  }

  const handleSubmit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    const parsedRate = parsePositiveNumber(rate);
    if (parsedRate === null) {
      setRateError(t('currencies.invalidRate'));
      return;
    }
    setRateError(undefined);
    setPendingRequest({
      sourceCurrency,
      targetCurrency,
      rate: parsedRate,
      startDate: toRangeBoundary(startDate, START_OF_DAY),
      endDate: toRangeBoundary(endDate, END_OF_DAY),
    });
  };

  const confirmRequest = () => {
    if (!pendingRequest) return;
    requestRecalculation.mutate(pendingRequest, {
      onSuccess: () => {
        setPendingRequest(null);
        setRate('');
      },
    });
  };

  const hasBothCurrencies = sourceCurrency !== '' && targetCurrency !== '';
  const canSubmit = hasBothCurrencies && sourceCurrency !== targetCurrency && rate !== '';
  const rateLabel = hasBothCurrencies
    ? t('currencies.recalculation.rate', { source: sourceCurrency, target: targetCurrency })
    : t('currencies.recalculation.rateFallback');

  return (
    <Card className="space-y-4">
      <p className="text-xs text-dn-text-muted">{t('currencies.recalculation.hint')}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <CurrencySelect
            label={t('currencies.recalculation.sourceCurrency')}
            value={sourceCurrency}
            onChange={setSourceCurrency}
          />
          <SearchableSelect
            label={t('currencies.recalculation.targetCurrency')}
            options={principalOptions}
            value={targetCurrency}
            onChange={(selected) => setTargetCurrency(selected == null ? '' : String(selected))}
          />
        </div>
        <Input
          label={rateLabel}
          inputMode="decimal"
          value={rate}
          onChange={(changeEvent) => setRate(changeEvent.target.value)}
          error={rateError}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('currencies.recalculation.startDate')}
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(changeEvent) => setStartDate(changeEvent.target.value)}
          />
          <Input
            label={t('currencies.recalculation.endDate')}
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(changeEvent) => setEndDate(changeEvent.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!canSubmit}>
            <Icon name="currency_exchange" className="text-sm" />
            {t('currencies.recalculation.submit')}
          </Button>
        </div>
      </form>
      <ConfirmModal
        open={pendingRequest !== null}
        onClose={() => setPendingRequest(null)}
        onConfirm={confirmRequest}
        loading={requestRecalculation.isPending}
        variant="primary"
        title={t('currencies.recalculation.confirmTitle')}
        confirmLabel={t('currencies.recalculation.submit')}
        message={
          pendingRequest
            ? t('currencies.recalculation.confirmMessage', {
                source: pendingRequest.sourceCurrency,
                target: pendingRequest.targetCurrency,
                rate: formatExchangeRate(pendingRequest.rate),
                range: describeRange(startDate, endDate),
              })
            : ''
        }
      />
    </Card>
  );
}

function RecalculationHistory() {
  const { t } = useTranslation();
  const { data: recalculations, isLoading } = useConversionRecalculations();

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!recalculations?.length) return null;

  return (
    <section>
      <SectionTitle>{t('currencies.recalculation.historySection')}</SectionTitle>
      <Card padding={false} className="overflow-hidden divide-y divide-white/5">
        {recalculations.map((recalculation) => (
          <RecalculationRow key={recalculation.id} recalculation={recalculation} />
        ))}
      </Card>
    </section>
  );
}

function RecalculationRow({ recalculation }: { recalculation: ConversionRecalculation }) {
  const { t } = useTranslation();
  const hasRange = Boolean(recalculation.startDate || recalculation.endDate);

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-mono text-dn-text-main">
          {t('currencies.recalculation.line', {
            source: recalculation.sourceCurrency,
            rate: formatExchangeRate(recalculation.rate),
            target: recalculation.targetCurrency,
          })}
        </p>
        <p className="text-xs text-dn-text-muted">
          {hasRange && `${formatDate(recalculation.startDate) || '…'} – ${formatDate(recalculation.endDate) || '…'} · `}
          {formatDateTime(recalculation.requestedAt)}
        </p>
        {recalculation.status === 'FAILED' && recalculation.message && (
          <p className="text-xs text-dn-warning">{recalculation.message}</p>
        )}
      </div>
      <RecalculationStatusBadge recalculation={recalculation} />
    </div>
  );
}

function RecalculationStatusBadge({ recalculation }: { recalculation: ConversionRecalculation }) {
  const { t } = useTranslation();

  if (recalculation.status === 'PENDING') {
    return (
      <span className="text-xs text-dn-warning flex items-center gap-1 shrink-0">
        <ConvertingIcon />
        {t('currencies.recalculation.status.PENDING')}
      </span>
    );
  }
  if (recalculation.status === 'FAILED') {
    return <Badge variant="expense" size="sm">{t('currencies.recalculation.status.FAILED')}</Badge>;
  }
  return (
    <Badge variant="gray" size="sm">
      {t('currencies.recalculation.status.COMPLETED', { count: recalculation.recalculatedCount })}
    </Badge>
  );
}
