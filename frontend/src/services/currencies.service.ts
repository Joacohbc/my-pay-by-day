import type { CurrencySetting, ExchangeRate, RecordExchangeRateDto } from '@/models';
import { api } from '@/services/api';

export const currenciesService = {
  getAll: () => api.get<CurrencySetting[]>('/currencies'),
  setPrincipal: (code: string, principal: boolean) =>
    api.put<CurrencySetting>(`/currencies/${code}`, { principal }),
  getRateHistory: (currency?: string) =>
    api.get<ExchangeRate[]>(currency ? `/exchange-rates?currency=${currency}` : '/exchange-rates'),
  recordRate: (dto: RecordExchangeRateDto) => api.post<ExchangeRate>('/exchange-rates', dto),
  refreshRates: () => api.post<ExchangeRate[]>('/exchange-rates/refresh', {}),
};
