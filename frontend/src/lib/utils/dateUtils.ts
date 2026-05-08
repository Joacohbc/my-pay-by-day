// Date utilities to handle timezone conversions between user's local and server timezone, as well as transforming date strings in API responses/requests.
import { formatInTimeZone, toDate } from 'date-fns-tz';
import type { DynamicPeriodOption } from '@/components/time-periods/DynamicTimePeriodSelector';
import { getLocalizedNow } from '@/lib/format';

const USER_TIMEZONE_KEY = 'user-timezone';

export function getUserTimezone(): string {
  const stored = localStorage.getItem(USER_TIMEZONE_KEY);
  if (stored) return stored;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return getServerTimezone(); // Fallback to server timezone if user's timezone can't be determined
  }
}

export function setUserTimezone(tz: string): void {
  localStorage.setItem(USER_TIMEZONE_KEY, tz || getUserTimezone());
}

export function initUserTimezone(): void {
  if (!localStorage.getItem(USER_TIMEZONE_KEY)) {
    localStorage.setItem(USER_TIMEZONE_KEY, getUserTimezone());
  }
}

// TODO: Use /config endpoint to get server timezone instead of hardcoding it
/*
* This should request the /config endpoint
* from the backend to get the server timezone instead of hardcoding it, 
* but for now we know it's always UTC.
*/
export function getServerTimezone(): string {
  // The server always uses UTC as per backend config
  return 'UTC';
}

/**
 * Converts a UTC date string received from the backend to the user's timezone.
 */
export function fromServerDate(dateString: string): string {
  if (!dateString) return dateString;
  // If it's just a date (yyyy-MM-dd), don't touch it
  if (dateString.length === 10) return dateString;

  // Assume it's a LocalDateTime coming from backend (no Z), force it to be UTC
  const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  const date = new Date(utcString);
  const userTz = getUserTimezone();
  return formatInTimeZone(date, userTz, "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * Converts a date string in the user's timezone to the server timezone for the backend.
 */
export function toServerDate(dateString: string): string {
  if (!dateString) return dateString;
  // If it's just a date (yyyy-MM-dd), don't touch it
  if (dateString.length === 10) return dateString;

  const userTz = getUserTimezone();
  const serverTz = getServerTimezone();
  const date = toDate(dateString, { timeZone: userTz });
  return formatInTimeZone(date, serverTz, "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * Recursively intercepts and transforms objects/arrays containing date properties.
 * Identifies date strings looking like "YYYY-MM-DDTHH:mm:ss"
 */
export function transformDates(obj: unknown, transformer: (val: string) => string): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformDates(item, transformer));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      result[key] = transformer(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = transformDates(value, transformer);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function getDynamicPeriodDates(option: DynamicPeriodOption): { startDate: string; endDate: string } {
  const now = getLocalizedNow();

  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const start = new Date(now);
  const end = new Date(now);

  switch (option) {
    case 'TODAY':
      break;
    case 'YESTERDAY':
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
      break;
    case 'THIS_WEEK': {
      const dayOfWeek = now.getDay();
      start.setDate(now.getDate() - dayOfWeek);
      end.setDate(now.getDate() + (6 - dayOfWeek));
      break;
    }
    case 'LAST_WEEK': {
      const lastWeekNow = new Date(now);
      lastWeekNow.setDate(now.getDate() - 7);
      const lwDayOfWeek = lastWeekNow.getDay();
      start.setTime(lastWeekNow.getTime());
      end.setTime(lastWeekNow.getTime());
      start.setDate(lastWeekNow.getDate() - lwDayOfWeek);
      end.setDate(lastWeekNow.getDate() + (6 - lwDayOfWeek));
      break;
    }
    case 'THIS_MONTH':
      start.setDate(1);
      end.setMonth(now.getMonth() + 1);
      end.setDate(0);
      break;
    case 'LAST_MONTH':
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      end.setMonth(now.getMonth());
      end.setDate(0);
      break;
    case 'THIS_YEAR':
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      break;
  }

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}
