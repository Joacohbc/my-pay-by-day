import type {
  ConversionRecalculation,
  CurrencySetting,
  ExchangeRate,
  ExchangeRateRefreshSchedule,
  ProviderQuote,
  RecordExchangeRateDto,
  RequestConversionRecalculationDto,
  UpdateExchangeRateRefreshScheduleDto,
} from '@/models';
import { api } from '@/services/api';

export const currenciesService = {
  getAll: () => api.get<CurrencySetting[]>('/currencies'),
  setPrincipal: (code: string, principal: boolean) =>
    api.put<CurrencySetting>(`/currencies/${code}`, { principal }),
  makeBase: (code: string) => api.post<CurrencySetting>(`/currencies/${code}/base`),
  getRateHistory: (currency?: string) =>
    api.get<ExchangeRate[]>(currency ? `/exchange-rates?currency=${currency}` : '/exchange-rates'),
  recordRate: (dto: RecordExchangeRateDto) => api.post<ExchangeRate>('/exchange-rates', dto),
  previewProviderQuotes: () => api.get<ProviderQuote[]>('/exchange-rates/provider-quotes'),
  refreshRates: () => api.post<ExchangeRate[]>('/exchange-rates/refresh', {}),
  getRefreshSchedule: () => api.get<ExchangeRateRefreshSchedule>('/exchange-rates/refresh-schedule'),
  updateRefreshSchedule: (dto: UpdateExchangeRateRefreshScheduleDto) =>
    api.put<ExchangeRateRefreshSchedule>('/exchange-rates/refresh-schedule', dto),
  getRecalculations: () => api.get<ConversionRecalculation[]>('/conversion-recalculations'),
  requestRecalculation: (dto: RequestConversionRecalculationDto) =>
    api.post<ConversionRecalculation>('/conversion-recalculations', dto),
};
