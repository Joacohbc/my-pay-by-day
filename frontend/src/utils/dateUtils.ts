// Date utilities to handle timezone conversions between user's local and server's UTC
import { formatInTimeZone, toDate } from 'date-fns-tz';

export function getUserTimezone(): string {
  // Try to get from localStorage, fallback to browser's default
  const stored = localStorage.getItem('user-timezone');
  if (stored) return stored;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

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
 * Converts a date string in the user's timezone to UTC for the backend.
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
