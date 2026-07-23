import { randomUUID } from 'node:crypto';
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
  /** Correlation ID that ties frontend, chatbot and backend logs together for a single request. */
  requestId: string;
  chatId?: string;
  /** When the chat is opened from a form's mini-chat widget, the draft/event currently being edited. */
  scope?: ChatScope;
}

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_LANG = 'en';
export const DEFAULT_CURRENCY = 'USD';
const SUPPORTED_LANGS = new Set(['en', 'es']);
const ISO_CURRENCY_CODE = /^[A-Za-z]{3}$/;

const generatedRequestIds = new WeakMap<Request, string>();

/**
 * Resolves the correlation ID for a request: the incoming `X-Request-Id` header if present,
 * otherwise a generated UUID cached per raw request so every call within the same request —
 * the logging middleware and each `requestContextFrom` — sees the exact same ID.
 */
export function resolveRequestId(c: Context): string {
  const header = c.req.header('X-Request-Id');
  if (header) return header;
  const cached = generatedRequestIds.get(c.req.raw);
  if (cached) return cached;
  const generated = randomUUID();
  generatedRequestIds.set(c.req.raw, generated);
  return generated;
}

/**
 * Correlation ID for a single tool call: the request's own ID (which already starts with the chat
 * id) plus the tool name and its call id, so a tool's logs and the backend calls it makes are
 * traceable both on their own and as part of the conversation they belong to.
 */
export function toolRequestId(requestId: string, toolName: string, toolCallId?: string): string {
  return [requestId, toolName, toolCallId].filter(Boolean).join('-');
}

export function requestContextFrom(c: Context): RequestContext {
  const timezone = c.req.header('X-Timezone') || DEFAULT_TIMEZONE;
  const rawLang = (c.req.header('X-Language') || DEFAULT_LANG).toLowerCase();
  const lang = SUPPORTED_LANGS.has(rawLang) ? rawLang : DEFAULT_LANG;
  const rawCurrency = (c.req.header('X-Currency') || DEFAULT_CURRENCY).toUpperCase();
  const currency = ISO_CURRENCY_CODE.test(rawCurrency) ? rawCurrency : DEFAULT_CURRENCY;
  return { timezone, lang, currency, requestId: resolveRequestId(c) };
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
