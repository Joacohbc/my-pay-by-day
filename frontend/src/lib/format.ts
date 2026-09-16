import i18n from '@/lib/i18n';
import type { FinanceEvent, Money } from '@/models';
import { getServerTimezone, getUserTimezone, fromServerDate } from '@/lib/utils/dateUtils';
import { formatIsoDate, getMaskPlaceholder } from '@/lib/utils/dateFormat';
import { formatInTimeZone } from 'date-fns-tz';

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
};

const CURRENCY_KEY = 'app-currency';
const DEFAULT_CURRENCY = 'USD';

/**
 * Currencies with no minor unit. `Intl` knows this, but only when it is allowed to decide: forcing
 * `minimumFractionDigits: 2` would render ¥1.200 as "¥1.200,00", which is not how the amount is
 * ever written.
 */
function fractionDigitsFor(currency: string): number | undefined {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency })
      .resolvedOptions().minimumFractionDigits;
  } catch {
    return undefined;
  }
}

const currencyListeners: Array<() => void> = [];

/**
 * The currency new amounts are preselected with. It is a display default only: it never decides
 * how a stored amount is read, since every amount arrives from the backend with its own code.
 */
export function getCurrency(): string {
  try {
    return localStorage.getItem(CURRENCY_KEY) ?? DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

/**
 * Seeds the entry currency from the server's configured default, once, before the user has ever
 * chosen one. Without this a ledger kept in UYU would offer USD on every new amount, and the
 * server's own `APP_DEFAULT_CURRENCY` — which is what its migration backfilled with — would
 * disagree with what the UI proposes.
 */
export function initCurrency(serverDefault: string | undefined): void {
  if (!serverDefault) return;
  try {
    if (localStorage.getItem(CURRENCY_KEY) == null) {
      localStorage.setItem(CURRENCY_KEY, serverDefault);
      currencyListeners.forEach((fn) => fn());
    }
  } catch {
    // A browser that refuses storage falls back to DEFAULT_CURRENCY, as getCurrency already does.
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

/**
 * Renders an amount in the currency that denominates it.
 *
 * The currency is a required argument rather than a global lookup: amounts of different
 * currencies coexist on the same screen, so reading it from the user's preference would label a
 * UYU expense with a dollar sign. Pass the `currency` that travelled with the amount.
 */
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigitsFor(currency),
  }).format(amount);
}

/**
 * Rounds and formats large numbers for small screens (e.g., 1.2k, 1.5M).
 */
export function formatCompactWitNotCurrency(amount: number): string {
  return new Intl.NumberFormat(locale(), {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Rounds and formats large numbers for small screens (e.g., 1.2k, 1.5M).
 */
export function formatCompactMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatMoneyShort(amount: number, currency: string): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency,
    compactDisplay: 'short',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Totals a set of amounts, one total per currency.
 *
 * The system stores no exchange rates, so a plain `reduce` over mixed currencies would produce a
 * number denominated in nothing. Grouping first is what keeps a total meaningful.
 */
export function sumByCurrency(entries: Array<{ amount: number; currency: string }>): Money[] {
  const totals = new Map<string, number>();
  for (const { amount, currency } of entries) {
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  }
  return [...totals].map(([currency, amount]) => ({ amount, currency }));
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

/** Compact numeric date (e.g. "27/07/26") for tight rows where the full month name doesn't fit. */
export function formatDateShort(input: string | Date | undefined | null): string {
  if (!input) return '';
  const dateStr = typeof input === 'string' && !input.includes('T') ? `${input}T00:00:00Z` : input;
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return typeof input === 'string' ? input : '';
  return new Intl.DateTimeFormat(locale(), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: typeof input === 'string' && !input.includes('T') ? getServerTimezone() : getUserTimezone(),
  }).format(date);
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

/** One-line label for pickers/selects that need to identify an event or draft at a glance. */
export function eventCurrency(event: FinanceEvent): string {
  return event.currency ?? event.lineItems?.[0]?.currency ?? getCurrency();
}

export function describeFinanceEvent(event: FinanceEvent): string {
  const amount = formatMoney(Math.abs(eventNetAmount(event)), eventCurrency(event));
  const date = formatDate(event.transactionDate);
  return date ? `${event.name} · ${date} · ${amount}` : `${event.name} · ${amount}`;
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
