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

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat(locale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoString));
}

export function formatDateFromParts(dateOnly: string): string {
  return new Intl.DateTimeFormat(locale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateOnly + 'T00:00:00'));
}

export function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat(locale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function formatDateInput(isoString: string): string {
  // Returns YYYY-MM-DDTHH:mm for datetime-local inputs
  return isoString.slice(0, 16);
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

export function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}
