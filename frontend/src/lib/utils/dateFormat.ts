import { format as formatDateFns, parse as parseDateFns, isValid } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import i18n from '@/lib/i18n';

export type DateFormatId =
  | 'dd/MM/yyyy'
  | 'MM/dd/yyyy'
  | 'yyyy-MM-dd'
  | 'dd-MM-yyyy'
  | 'dd.MM.yyyy'
  | 'dd MMM yyyy'
  | 'MMM d, yyyy'
  | "d MMMM, yyyy";

export interface DateFormatOption {
  id: DateFormatId;
  pattern: string;
  isNumeric: boolean;
  mask?: string;
  separator?: string;
  separators?: string[];
  digitGroups?: number[];
  hasTime?: boolean;
}

function resolveSeparators(opt: DateFormatOption): string[] | null {
  if (opt.separators) return opt.separators;
  if (opt.separator && opt.digitGroups) {
    return Array(opt.digitGroups.length - 1).fill(opt.separator);
  }
  return null;
}

export function withTime(opt: DateFormatOption): DateFormatOption {
  if (opt.hasTime) return opt;
  const baseSeparators = resolveSeparators(opt);
  return {
    ...opt,
    pattern: `${opt.pattern} HH:mm`,
    mask: opt.mask ? `${opt.mask} hh:mm` : undefined,
    digitGroups: opt.digitGroups ? [...opt.digitGroups, 2, 2] : undefined,
    separators: baseSeparators ? [...baseSeparators, ' ', ':'] : undefined,
    hasTime: true,
  };
}

export const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
  { id: 'dd/MM/yyyy', pattern: 'dd/MM/yyyy', isNumeric: true, mask: 'dd/mm/yyyy', separator: '/', digitGroups: [2, 2, 4] },
  { id: 'MM/dd/yyyy', pattern: 'MM/dd/yyyy', isNumeric: true, mask: 'mm/dd/yyyy', separator: '/', digitGroups: [2, 2, 4] },
  { id: 'yyyy-MM-dd', pattern: 'yyyy-MM-dd', isNumeric: true, mask: 'yyyy-mm-dd', separator: '-', digitGroups: [4, 2, 2] },
  { id: 'dd-MM-yyyy', pattern: 'dd-MM-yyyy', isNumeric: true, mask: 'dd-mm-yyyy', separator: '-', digitGroups: [2, 2, 4] },
  { id: 'dd.MM.yyyy', pattern: 'dd.MM.yyyy', isNumeric: true, mask: 'dd.mm.yyyy', separator: '.', digitGroups: [2, 2, 4] },
  { id: 'dd MMM yyyy', pattern: 'dd MMM yyyy', isNumeric: false },
  { id: 'MMM d, yyyy', pattern: 'MMM d, yyyy', isNumeric: false },
  { id: "d MMMM, yyyy", pattern: "d MMMM, yyyy", isNumeric: false },
];

const DATE_FORMAT_KEY = 'app-date-format';
const dateFormatListeners: Array<() => void> = [];

function defaultIdForLocale(): DateFormatId {
  return i18n.language === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
}

export function getDateFormatId(): DateFormatId {
  try {
    const stored = localStorage.getItem(DATE_FORMAT_KEY);
    if (stored && DATE_FORMAT_OPTIONS.some((opt) => opt.id === stored)) {
      return stored as DateFormatId;
    }
  } catch {
    // ignore
  }
  return defaultIdForLocale();
}

export function setDateFormatId(id: DateFormatId): void {
  try {
    localStorage.setItem(DATE_FORMAT_KEY, id);
  } catch {
    // ignore
  }
  dateFormatListeners.forEach((fn) => fn());
}

export function onDateFormatChange(fn: () => void): () => void {
  dateFormatListeners.push(fn);
  return () => {
    const idx = dateFormatListeners.indexOf(fn);
    if (idx >= 0) dateFormatListeners.splice(idx, 1);
  };
}

export function getDateFormat(): DateFormatOption {
  const id = getDateFormatId();
  return DATE_FORMAT_OPTIONS.find((opt) => opt.id === id) ?? DATE_FORMAT_OPTIONS[0];
}

function activeLocale(): Locale {
  return i18n.language === 'es' ? es : enUS;
}

function isoToLocalDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(+y, +mo - 1, +d, h ? +h : 0, mi ? +mi : 0, s ? +s : 0);
}

export function formatIsoDate(iso: string, opt: DateFormatOption = getDateFormat()): string {
  const date = isoToLocalDate(iso);
  if (!date || !isValid(date)) return '';
  return formatDateFns(date, opt.pattern, { locale: activeLocale() });
}

export function parseFormattedDate(text: string, opt: DateFormatOption = getDateFormat()): string | null {
  if (!text) return null;
  const parsed = parseDateFns(text, opt.pattern, new Date(), { locale: activeLocale() });
  if (!isValid(parsed)) return null;
  const yyyy = String(parsed.getFullYear()).padStart(4, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  if (opt.hasTime) {
    const hh = String(parsed.getHours()).padStart(2, '0');
    const mi = String(parsed.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }
  return `${yyyy}-${mm}-${dd}`;
}

export function getMaskPlaceholder(opt: DateFormatOption = getDateFormat()): string {
  return opt.mask ?? opt.pattern;
}

export function applyDateMask(input: string, opt: DateFormatOption): string {
  if (!opt.isNumeric || !opt.digitGroups) return input;
  const separators = resolveSeparators(opt);
  if (!separators) return input;
  const digits = input.replace(/\D/g, '');
  const totalDigits = opt.digitGroups.reduce((sum, n) => sum + n, 0);
  const trimmed = digits.slice(0, totalDigits);
  let out = '';
  let cursor = 0;
  for (let i = 0; i < opt.digitGroups.length; i++) {
    if (cursor >= trimmed.length) break;
    if (i > 0) out += separators[i - 1];
    out += trimmed.slice(cursor, cursor + opt.digitGroups[i]);
    cursor += opt.digitGroups[i];
  }
  return out;
}

export function isMaskComplete(text: string, opt: DateFormatOption): boolean {
  if (!opt.isNumeric || !opt.digitGroups) return false;
  const digits = text.replace(/\D/g, '');
  const totalDigits = opt.digitGroups.reduce((sum, n) => sum + n, 0);
  return digits.length === totalDigits;
}
