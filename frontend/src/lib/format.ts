import i18n from '@/lib/i18n';
import type { FinanceEvent } from '@/models';
import { getServerTimezone, getUserTimezone, fromServerDate } from '@/lib/utils/dateUtils';
import { formatIsoDate, getMaskPlaceholder } from '@/lib/utils/dateFormat';
import { formatInTimeZone } from 'date-fns-tz';

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
    compactDisplay: 'short',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(input: string | Date | undefined | null): string {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(date.getTime())) return typeof input === 'string' ? input : '';
  return new Intl.DateTimeFormat(locale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: getUserTimezone(),
  }).format(date);
}

export function formatServerDate(serverDateTime: string | undefined | null): string {
  if (!serverDateTime) return '';
  if (serverDateTime.length === 10) {
    return formatDateFromParts(serverDateTime);
  }
  const localDateStr = fromServerDate(serverDateTime);
  return formatDate(localDateStr);
}

export function formatDateFromParts(dateOnly: string | undefined | null): string {
  if (!dateOnly) return '';
  const dateStr = dateOnly.includes('T') ? dateOnly : `${dateOnly}T00:00:00Z`;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateOnly;

  // Always evaluate "just a date" using server timezone internally so it doesn't drift,
  // as LocalDate on the server has no timezone.
  return new Intl.DateTimeFormat(locale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: getServerTimezone(),
  }).format(date);
}

export function formatDateTime(input: string | Date | undefined | null): string {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(date.getTime())) return typeof input === 'string' ? input : '';
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

export function formatDateInputDisplay(isoDate: string): string {
  return formatIsoDate(isoDate);
}

export function getDateInputPlaceholder(): string {
  return getMaskPlaceholder();
}

/**
 * Returns a new Date object representing "now" evaluated in the user's localized timezone.
 */
export function getLocalizedNow(): Date {
  const wallClockIso = formatInTimeZone(new Date(), getUserTimezone(), "yyyy-MM-dd'T'HH:mm:ss");
  return new Date(wallClockIso);
}

export function getLocalizedTodayString(): string {
  return formatInTimeZone(new Date(), getUserTimezone(), 'yyyy-MM-dd');
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
  return items.reduce((s, li) => s + Math.abs(Number(li.amount)), 0) / 2;
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

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
