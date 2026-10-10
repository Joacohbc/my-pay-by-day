import { tool } from 'ai';
import { z } from 'zod';
import { BackendError, createApiClient, unwrap } from '@/backend/client.js';
import type { RequestContext } from '@/context.js';
import { EVENT_MUTATION_DOMAINS, type CacheDomain, type KindedToolSet } from '@/tools/types.js';

const RATE_REFRESH_DOMAINS: readonly CacheDomain[] = ['currencies', ...EVENT_MUTATION_DOMAINS];

async function safe<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof BackendError ? e.message : (e as Error).message;
    return { error: message };
  }
}

/** Exchange-rate tools: the rates the app holds, and what the configured exchange-rate providers quote right now. */
export function buildCurrencyTools(ctx: RequestContext): KindedToolSet {
  const client = createApiClient(ctx);

  return {
    getExchangeRates: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking exchange rates...', es: 'Consultando cotizaciones...' } },
      tool: tool({
        description:
          'List the currencies the user works with and the exchange rate the app currently holds for each. ' +
          'Every rate is unitsPerBase: how many units of that currency buy ONE unit of the base currency ' +
          '(e.g. base USD, UYU unitsPerBase 40 means 1 USD = 40 UYU). The base currency has no rate (it is 1 by definition). ' +
          'Each rate names the provider it was fetched from (rateProvider), if any. ' +
          'These are the rates the app converts with; to know what the providers quote right now use getLiveExchangeRates.',
        inputSchema: z.object({}),
        execute: () =>
          safe(async () => {
            const currencies = await unwrap(client.GET('/currencies'));
            return {
              baseCurrency: currencies.find((currency) => currency.base)?.code ?? null,
              currencies: currencies.map((currency) => ({
                code: currency.code,
                base: currency.base,
                principal: currency.principal,
                unitsPerBase: currency.currentRate?.unitsPerBase ?? null,
                rateSource: currency.currentRate?.source ?? null,
                rateProvider: currency.currentRate?.provider ?? null,
                rateRecordedAt: currency.currentRate?.recordedAt ?? null,
              })),
            };
          }),
      }),
    },

    getLiveExchangeRates: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking live exchange rates...', es: 'Consultando cotizaciones actuales...' } },
      tool: tool({
        description:
          'Ask the configured exchange-rate providers what they quote right now. Each quote names its provider (source) ' +
          'and which of its prices it is (quotedPrice: BUYING, SELLING, or MID, the midpoint of both). Read-only: nothing ' +
          "is saved. Use it whenever the user asks how much a currency is worth or to convert an amount at today's rate. " +
          'Quotes are unitsPerBase against the base currency: how many units of the currency buy ONE unit of the base ' +
          '(e.g. base USD, UYU unitsPerBase 40 means 1 USD = 40 UYU). Only currencies the user has configured and some ' +
          'provider quotes are returned. To adopt the quotes as the app rates, use refreshExchangeRates.',
        inputSchema: z.object({}),
        execute: () =>
          safe(async () => ({ quotes: await unwrap(client.GET('/exchange-rates/provider-quotes')) })),
      }),
    },

    refreshExchangeRates: {
      kind: 'WRITE',
      ui: { invalidates: RATE_REFRESH_DOMAINS, label: { en: 'Updating exchange rates from the providers...', es: 'Actualizando cotizaciones desde los proveedores...' } },
      tool: tool({
        description:
          "Record the exchange-rate providers' current quotes as the app's exchange rates. " +
          'From then on new entries convert with it, and past entries that had no conversion yet get one; entries already ' +
          'converted keep the rate frozen on them. ' +
          'Only call it when the user explicitly asks to update or save the rate, never just to answer what the dollar is worth.',
        inputSchema: z.object({}),
        execute: () =>
          safe(async () => ({ recorded: await unwrap(client.POST('/exchange-rates/refresh')) })),
      }),
    },
  };
}
