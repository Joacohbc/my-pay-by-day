import type { FinanceEvent } from '@/models';

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatCurrency(amount: number): string {
  return currencyFmt.format(amount);
}

export function formatDate(isoString: string): string {
  return dateFmt.format(new Date(isoString));
}

export function formatDateTime(isoString: string): string {
  return timeFmt.format(new Date(isoString));
}

export function formatDateInput(isoString: string): string {
  // Returns YYYY-MM-DDTHH:mm for datetime-local inputs
  return isoString.slice(0, 16);
}

/**
 * For INBOUND: sum of positive line items (inflows to own account).
 * For OUTBOUND: sum of negative line items (outflows from own account).
 * For OTHER: sum of all absolute values divided by 2.
 */
export function eventNetAmount(event: FinanceEvent): number {
  if (!event.transaction?.lineItems?.length) return 0;
  const items = event.transaction.lineItems;
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
