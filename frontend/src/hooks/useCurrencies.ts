import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAlert } from '@/contexts/AlertContext';
import { currenciesService } from '@/services/currencies.service';
import type {
  ConversionRecalculation,
  CurrencySetting,
  RecordExchangeRateDto,
  RequestConversionRecalculationDto,
  UpdateExchangeRateRefreshScheduleDto,
} from '@/models';
import { currencyKeys } from '@/lib/queryKeys';
import { cachePolicy } from '@/lib/cachePolicies';
import { invalidateDomains, EVENT_MUTATION_DOMAINS } from '@/lib/cacheInvalidation';

const PENDING_CONVERSION_POLL_MS = 5000;

function hasPendingConversion(currencies: CurrencySetting[] | undefined): boolean {
  return currencies?.some((currency) => currency.conversionPending) ?? false;
}

function hasPendingRecalculation(recalculations: ConversionRecalculation[] | undefined): boolean {
  return recalculations?.some((recalculation) => recalculation.status === 'PENDING') ?? false;
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

/**
 * What the provider quotes right now, fetched only while `isEnabled` (the preview is open) and never
 * served from cache: the point is to see the current quote before recording it.
 */
export function useProviderQuotesPreview(isEnabled: boolean) {
  return useQuery({
    queryKey: currencyKeys.providerQuotes(),
    queryFn: () => currenciesService.previewProviderQuotes(),
    enabled: isEnabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

/** One currency's current provider quote, fetched on demand to fill the rate form; nothing is recorded. */
export function useFetchProviderQuote() {
  return useMutation({
    mutationFn: (currency: string) => currenciesService.previewProviderQuotes(currency),
  });
}

export function useExchangeRateRefreshSchedule() {
  return useQuery({
    queryKey: currencyKeys.refreshSchedule(),
    queryFn: currenciesService.getRefreshSchedule,
    ...cachePolicy.reference,
  });
}

export function useUpdateExchangeRateRefreshSchedule() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: UpdateExchangeRateRefreshScheduleDto) => currenciesService.updateRefreshSchedule(dto),
    onSuccess: (saved) => {
      queryClient.setQueryData(currencyKeys.refreshSchedule(), saved);
      alert.success(t('currencies.schedule.saved'));
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

/**
 * Recent recalculations, polled while one is still running so its final count shows up on its own.
 * Refreshing the views once it finishes is left to `useCurrencies`, which sees the same job through
 * the target currency's `conversionPending`.
 */
export function useConversionRecalculations() {
  return useQuery({
    queryKey: currencyKeys.recalculations(),
    queryFn: currenciesService.getRecalculations,
    refetchInterval: (currentQuery) =>
      hasPendingRecalculation(currentQuery.state.data) ? PENDING_CONVERSION_POLL_MS : false,
    ...cachePolicy.reference,
  });
}

export function useRequestConversionRecalculation() {
  const queryClient = useQueryClient();
  const alert = useAlert();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (dto: RequestConversionRecalculationDto) => currenciesService.requestRecalculation(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.all });
      alert.success(t('currencies.recalculation.queued'));
    },
    onError: (err) => alert.error(err instanceof Error ? err.message : t('common.error')),
  });
}
