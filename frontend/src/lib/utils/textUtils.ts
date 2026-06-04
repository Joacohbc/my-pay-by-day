/** Normalize text for accent-insensitive, case-insensitive comparison. */
export const normalizeText = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
