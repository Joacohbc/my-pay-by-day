import { z } from 'zod/v4';

// ─── Constants (mirrors Java RegexValidator) ──────────────────────────────────
// Keep these in sync with:
// mypaybyday/src/main/java/com/mypaybyday/validation/RegexValidator.java

export const SHORT_MAX_LENGTH = 255;
export const LONG_MAX_LENGTH = 5100;

export const GENERAL_TEXT_REGEX = /^[\p{L}\p{N}\s\p{P}\p{S}]+$/u;

export const LETTERS_AND_NUMBERS_REGEX = GENERAL_TEXT_REGEX;
export const LETTERS_NUMBERS_AND_EXTRAS_REGEX = GENERAL_TEXT_REGEX;

// ─── Reusable Zod field builders ─────────────────────────────────────────────

export function nameField(t: (key: string) => string) {
  return z
    .string()
    .min(1, t('validation.nameRequired'))
    .max(SHORT_MAX_LENGTH, t('validation.nameTooLong'))
    .regex(LETTERS_AND_NUMBERS_REGEX, t('validation.nameInvalidChars'));
}

export function descriptionField(t: (key: string) => string) {
  return z
    .string()
    .max(LONG_MAX_LENGTH, t('validation.descriptionTooLong'))
    .regex(LETTERS_NUMBERS_AND_EXTRAS_REGEX, t('validation.descriptionInvalidChars'))
    .optional()
    .or(z.literal(''));
}

export function optionalNumberField(t: (key: string) => string) {
  return z.number({ error: t('validation.numberInvalid') }).optional();
}

export function optionalAmountField(t: (key: string) => string) {
  return z
    .number({ error: t('validation.numberInvalid') })
    .nonnegative(t('validation.amountNegative'))
    .optional();
}

export function requiredCountField(t: (key: string) => string) {
  return z.number({ error: t('validation.numberRequired') }).min(1, t('validation.numberMinimum'));
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function optionalEventTypeField() {
  return z.enum(['INBOUND', 'OUTBOUND', 'OTHER']).optional().or(z.literal(''));
}

export function optionalNodeIdField() {
  return z.string().optional();
}

export function optionalCategoryIdField() {
  return z.string().optional();
}

export function optionalTagIdsField() {
  return z.array(z.string()).optional();
}
