import { formatInTimeZone, toDate } from 'date-fns-tz';

/** The backend stores wall-clock datetimes in this zone (the app runs the server in UTC). */
export const SERVER_TIMEZONE = 'UTC';

const ISO_LOCAL = "yyyy-MM-dd'T'HH:mm:ss";

/**
 * A wall-clock datetime string already converted to the server timezone. The brand exists
 * only at compile time: it prevents a raw user-local string from being sent to the backend
 * without first passing through {@link toServerDateTime} / `normalizeTransactionDate`.
 */
export type ServerDateTime = string & { readonly __brand: 'ServerDateTime' };

/**
 * Converts a wall-clock datetime written in the user's timezone into the equivalent
 * wall-clock datetime in the server timezone, mirroring the frontend `toServerDate`.
 */
export function toServerDateTime(localDateTime: string, userTimezone: string): ServerDateTime {
  const instant = toDate(localDateTime, { timeZone: userTimezone });
  return formatInTimeZone(instant, SERVER_TIMEZONE, ISO_LOCAL) as ServerDateTime;
}

/**
 * Asserts a datetime string that already originates from the backend is server-time, so it can be
 * echoed back in a payload without re-conversion. Use only for values read from the backend.
 */
export function asServerDateTime(value: string): ServerDateTime {
  return value as ServerDateTime;
}

/** Current datetime formatted as a wall-clock string in the user's timezone. */
export function nowInTimezone(userTimezone: string): string {
  return formatInTimeZone(new Date(), userTimezone, ISO_LOCAL);
}

/** Human-readable "now" used to ground the model (e.g. "2026-06-30T14:05:00 (America/Montevideo)"). */
export function groundingNow(userTimezone: string): string {
  return `${nowInTimezone(userTimezone)} (${userTimezone})`;
}
