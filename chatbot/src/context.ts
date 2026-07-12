import type { Context } from 'hono';

export interface ChatScope {
  type: 'draft' | 'event';
  id: number;
}

/** Per-request user context propagated to the Java backend and used to ground the LLM. */
export interface RequestContext {
  timezone: string;
  lang: string;
  currency: string;
  chatId?: string;
  /** When the chat is opened from a form's mini-chat widget, the draft/event currently being edited. */
  scope?: ChatScope;
}

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_LANG = 'en';
export const DEFAULT_CURRENCY = 'USD';
const SUPPORTED_LANGS = new Set(['en', 'es']);
const ISO_CURRENCY_CODE = /^[A-Za-z]{3}$/;

export function requestContextFrom(c: Context): RequestContext {
  const timezone = c.req.header('X-Timezone') || DEFAULT_TIMEZONE;
  const rawLang = (c.req.header('X-Language') || DEFAULT_LANG).toLowerCase();
  const lang = SUPPORTED_LANGS.has(rawLang) ? rawLang : DEFAULT_LANG;
  const rawCurrency = (c.req.header('X-Currency') || DEFAULT_CURRENCY).toUpperCase();
  const currency = ISO_CURRENCY_CODE.test(rawCurrency) ? rawCurrency : DEFAULT_CURRENCY;
  return { timezone, lang, currency };
}

/** Same language→locale mapping the frontend uses for Intl formatting, so both render dates/amounts identically. */
export function localeFor(lang: string): string {
  switch (lang.toLowerCase()) {
    case 'es':
      return 'es-ES';
    case 'en':
      return 'en-US';
    default:
      return lang;
  }
}

export function languageName(lang: string): string {
  switch (lang.toLowerCase()) {
    case 'es':
      return 'Spanish';
    case 'en':
      return 'English';
    default:
      return lang;
  }
}
