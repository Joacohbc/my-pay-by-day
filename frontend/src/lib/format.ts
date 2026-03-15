import i18n from '@/i18n';
import type { FinanceEvent } from '@/models';

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
};

const CURRENCY_KEY = 'app-currency';
const DEFAULT_CURRENCY = 'USD';

const currencyListeners: Array<() => void> = [];

export function getCurrency(): string {
  try {
    return localStorage.getItem(CURRENCY_KEY) ?? DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function setCurrency(code: string) {
  try {
    localStorage.setItem(CURRENCY_KEY, code);
  } catch {
    // ignore
  }
  currencyListeners.forEach((fn) => fn());
}

export function onCurrencyChange(fn: () => void): () => void {
  currencyListeners.push(fn);
  return () => {
    const idx = currencyListeners.indexOf(fn);
    if (idx >= 0) currencyListeners.splice(idx, 1);
  };
}

function locale(): string {
  return LOCALE_MAP[i18n.language] ?? i18n.language;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: getCurrency(),
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Rounds and formats large numbers for small screens (e.g., 1.2k, 1.5M).
 */
export function formatCompactWitNotCurrency(amount: number): string {
  return new Intl.NumberFormat(locale(), {
    style: undefined,
    currency: getCurrency(),
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Rounds and formats large numbers for small screens (e.g., 1.2k, 1.5M).
 */
export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: getCurrency(),
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatCurrencyShort(amount: number): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: getCurrency(),
    maximumFractionDigits: 0,
  }).format(amount);
}

import { getUserTimezone } from '@/utils/dateUtils';

export function formatDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return new Intl.DateTimeFormat(locale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: getUserTimezone(),
  }).format(date);
}

export function formatDateFromParts(dateOnly: string): string {
  // Always evaluate "just a date" using UTC internally so it doesn't drift,
  // as LocalDate on the server has no timezone.
  return new Intl.DateTimeFormat(locale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(dateOnly + 'T00:00:00Z'));
}

export function formatDateTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return new Intl.DateTimeFormat(locale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getUserTimezone(),
  }).format(date);
}

export function formatDateInput(isoString: string): string {
  // Returns YYYY-MM-DDTHH:mm for datetime-local inputs
  return isoString.slice(0, 16);
}

/**
 * Returns a new Date object representing "now" evaluated in the user's localized timezone.
 */
export function getLocalizedNow(): Date {
  const nowIso = new Date().toLocaleString('en-US', { timeZone: getUserTimezone() });
  return new Date(nowIso);
}

/**
 * Returns the localized "today" as a YYYY-MM-DD string.
 */
export function getLocalizedTodayString(): string {
  const now = new Date();
  const yyyy = new Intl.DateTimeFormat('en-CA', { year: 'numeric', timeZone: getUserTimezone() }).format(now);
  const mm = new Intl.DateTimeFormat('en-CA', { month: '2-digit', timeZone: getUserTimezone() }).format(now);
  const dd = new Intl.DateTimeFormat('en-CA', { day: '2-digit', timeZone: getUserTimezone() }).format(now);
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * For INBOUND: sum of positive line items (inflows to own account).
 * For OUTBOUND: sum of negative line items (outflows from own account).
 * For OTHER: sum of all amounts.
 */
export function eventNetAmount(event: FinanceEvent): number {
  if (!event.lineItems?.length) return 0;
  const items = event.lineItems;
  if (event.type === 'INBOUND') {
    return items.filter((li) => li.amount > 0).reduce((s, li) => s + Number(li.amount), 0);
  }
  if (event.type === 'OUTBOUND') {
    return items.filter((li) => li.amount < 0).reduce((s, li) => s + Number(li.amount), 0);
  }
  // OTHER
  return items.reduce((s, li) => s + Number(li.amount), 0);
}

export function toLocalDateTimeString(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}
