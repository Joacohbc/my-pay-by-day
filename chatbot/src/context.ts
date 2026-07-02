import type { Context } from 'hono';

/** Per-request user context propagated to the Java backend and used to ground the LLM. */
export interface RequestContext {
  timezone: string;
  lang: string;
  chatId?: string;
}

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_LANG = 'en';
const SUPPORTED_LANGS = new Set(['en', 'es']);

export function requestContextFrom(c: Context): RequestContext {
  const timezone = c.req.header('X-Timezone') || DEFAULT_TIMEZONE;
  const rawLang = (c.req.header('X-Language') || DEFAULT_LANG).toLowerCase();
  const lang = SUPPORTED_LANGS.has(rawLang) ? rawLang : DEFAULT_LANG;
  return { timezone, lang };
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
