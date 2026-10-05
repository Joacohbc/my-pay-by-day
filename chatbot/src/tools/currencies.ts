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

/** Exchange-rate tools: the rates the app holds, and the BROU board's current quotes. */
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
          'These are the rates the app converts with; to know what the official rate is right now use getBankExchangeRate.',
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
                rateRecordedAt: currency.currentRate?.recordedAt ?? null,
              })),
            };
          }),
      }),
    },

    getBankExchangeRate: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Checking the BROU exchange rate...', es: 'Consultando la cotización del BROU...' } },
      tool: tool({
        description:
          "Read Banco República's (BROU) board right now, at its SELLING price ('venta'): the pesos the bank charges for one " +
          'unit of each currency, which is what buying dollars or paying a card balance in dollars costs. It covers USD, EUR, ' +
          'ARS, BRL, GBP, CHF and PYG. Read-only: nothing is saved. Use it whenever the user asks how much the dollar is or ' +
          "to convert an amount at today's rate. Quotes are unitsPerBase against the base currency: with base USD the UYU " +
          'quote is pesos per dollar; with base UYU each quote is the inverse (units per peso). Only currencies the user has ' +
          'configured are returned. To adopt the quotes as the app rates, use refreshExchangeRates.',
        inputSchema: z.object({}),
        execute: () =>
          safe(async () => ({ quotes: await unwrap(client.GET('/exchange-rates/provider-quotes')) })),
      }),
    },

    refreshExchangeRates: {
      kind: 'WRITE',
      ui: { invalidates: RATE_REFRESH_DOMAINS, label: { en: 'Updating exchange rates from the BROU...', es: 'Actualizando cotizaciones desde el BROU...' } },
      tool: tool({
        description:
          "Record the BROU board's current selling prices as the app's exchange rates. " +
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
