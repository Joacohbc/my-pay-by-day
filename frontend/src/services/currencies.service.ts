import type {
  ConversionRecalculation,
  CurrencySetting,
  ExchangeRate,
  RecordExchangeRateDto,
  RequestConversionRecalculationDto,
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
  refreshRates: () => api.post<ExchangeRate[]>('/exchange-rates/refresh', {}),
  getRecalculations: () => api.get<ConversionRecalculation[]>('/conversion-recalculations'),
  requestRecalculation: (dto: RequestConversionRecalculationDto) =>
    api.post<ConversionRecalculation>('/conversion-recalculations', dto),
};
