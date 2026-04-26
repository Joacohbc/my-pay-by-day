import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/en';
import es from '@/lib/i18n/es';

const LANG_KEY = 'app-language';
const SUPPORTED_LANGS = ['en', 'es'];

function getDefaultLanguage(): string {
  const browserLang = navigator.language?.split('-')[0];
  return SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'en';
}

function getSavedLanguage(): string {
  try {
    return localStorage.getItem(LANG_KEY) ?? getDefaultLanguage();
  } catch {
    return getDefaultLanguage();
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: getSavedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  parseMissingKeyHandler: () => 'TRANSLATION NOT FOUND',
});

export function initUserLanguage(): void {
  if (!localStorage.getItem(LANG_KEY)) {
    localStorage.setItem(LANG_KEY, getDefaultLanguage());
  }
}

export function changeLanguage(lng: string) {
  i18n.changeLanguage(lng);
  try {
    localStorage.setItem(LANG_KEY, lng);
  } catch {
    // ignore
  }
}

export default i18n;
