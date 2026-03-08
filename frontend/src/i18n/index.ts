import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/i18n/en';
import es from '@/i18n/es';

const LANG_KEY = 'app-language';

function getSavedLanguage(): string {
  try {
    return localStorage.getItem(LANG_KEY) ?? 'en';
  } catch {
    return 'en';
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
});

export function changeLanguage(lng: string) {
  i18n.changeLanguage(lng);
  try {
    localStorage.setItem(LANG_KEY, lng);
  } catch {
    // ignore
  }
}

export default i18n;
