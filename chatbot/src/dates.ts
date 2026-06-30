import { formatInTimeZone, toDate } from 'date-fns-tz';

/** The backend stores wall-clock datetimes in this zone (the app runs the server in UTC). */
export const SERVER_TIMEZONE = 'UTC';

const ISO_LOCAL = "yyyy-MM-dd'T'HH:mm:ss";

/**
 * Converts a wall-clock datetime written in the user's timezone into the equivalent
 * wall-clock datetime in the server timezone, mirroring the frontend `toServerDate`.
 */
export function toServerDateTime(localDateTime: string, userTimezone: string): string {
  const instant = toDate(localDateTime, { timeZone: userTimezone });
  return formatInTimeZone(instant, SERVER_TIMEZONE, ISO_LOCAL);
}

/** Current datetime formatted as a wall-clock string in the user's timezone. */
export function nowInTimezone(userTimezone: string): string {
  return formatInTimeZone(new Date(), userTimezone, ISO_LOCAL);
}

/** Human-readable "now" used to ground the model (e.g. "2026-06-30T14:05:00 (America/Montevideo)"). */
export function groundingNow(userTimezone: string): string {
  return `${nowInTimezone(userTimezone)} (${userTimezone})`;
}
