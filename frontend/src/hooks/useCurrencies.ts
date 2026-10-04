import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAlert } from '@/contexts/AlertContext';
import { currenciesService } from '@/services/currencies.service';
import type { CurrencySetting, RecordExchangeRateDto } from '@/models';
import { currencyKeys } from '@/lib/queryKeys';
import { cachePolicy } from '@/lib/cachePolicies';
import { invalidateDomains, EVENT_MUTATION_DOMAINS } from '@/lib/cacheInvalidation';

const PENDING_CONVERSION_POLL_MS = 5000;

function hasPendingConversion(currencies: CurrencySetting[] | undefined): boolean {
  return currencies?.some((currency) => currency.conversionPending) ?? false;
}

function invalidateCurrenciesAndFinances(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: currencyKeys.all });
  invalidateDomains(queryClient, EVENT_MUTATION_DOMAINS);
}

/**
 * Configured currencies, polled while past events are still being converted in the background so
 * every view picks up the new conversions as soon as the job finishes.
 */
export function useCurrencies() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: currencyKeys.list(),
    queryFn: currenciesService.getAll,
    refetchInterval: (currentQuery) =>
      hasPendingConversion(currentQuery.state.data) ? PENDING_CONVERSION_POLL_MS : false,
    ...cachePolicy.reference,
  });

  const isConverting = hasPendingConversion(query.data);
  const wasConverting = useRef(isConverting);
  useEffect(() => {
    const conversionJustFinished = wasConverting.current && !isConverting;
    wasConverting.current = isConverting;
    if (conversionJustFinished) invalidateDomains(queryClient, EVENT_MUTATION_DOMAINS);
  }, [isConverting, queryClient]);

  return query;
}

export function useExchangeRateHistory(currency?: string) {
  return useQuery({
    queryKey: currencyKeys.rateHistory(currency),
    queryFn: () => currenciesService.getRateHistory(currency),
    ...cachePolicy.reference,
  });
}

export function useSetPrincipalCurrency() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ code, principal }: { code: string; principal: boolean }) =>
      currenciesService.setPrincipal(code, principal),
    onSuccess: () => {
      invalidateCurrenciesAndFinances(queryClient);
      alert.success(t('common.saved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useMakeBaseCurrency() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (code: string) => currenciesService.makeBase(code),
    onSuccess: (baseCurrency) => {
      invalidateCurrenciesAndFinances(queryClient);
      alert.success(t('currencies.baseChanged', { code: baseCurrency.code }));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useRecordExchangeRate() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: RecordExchangeRateDto) => currenciesService.recordRate(dto),
    onSuccess: () => {
      invalidateCurrenciesAndFinances(queryClient);
      alert.success(t('currencies.rateSaved'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}

export function useRefreshExchangeRates() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: currenciesService.refreshRates,
    onSuccess: (recorded) => {
      invalidateCurrenciesAndFinances(queryClient);
      alert.success(t('currencies.ratesRefreshed', { count: recorded.length }));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
