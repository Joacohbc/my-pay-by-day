export function findFirstFieldErrorMessage(fieldErrors: unknown): string | undefined {
  if (!fieldErrors || typeof fieldErrors !== 'object') return undefined;

  if ('message' in fieldErrors && typeof (fieldErrors as { message: unknown }).message === 'string') {
    return (fieldErrors as { message: string }).message;
  }

  for (const child of Object.values(fieldErrors as object)) {
    const found = findFirstFieldErrorMessage(child);
    if (found) return found;
  }
  return undefined;
}
