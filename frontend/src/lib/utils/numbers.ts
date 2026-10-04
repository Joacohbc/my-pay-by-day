/** Parses user input that may use a decimal comma; anything that is not a number above zero is `null`. */
export function parsePositiveNumber(rawValue: string): number | null {
  const parsed = Number(rawValue.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
