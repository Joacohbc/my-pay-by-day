export function mergeFieldTextWithTranscription(currentValue: string, transcribedValue: string): string {
  const normalizedCurrentValue = currentValue.trim();
  const normalizedTranscribedValue = transcribedValue.trim();

  if (!normalizedTranscribedValue) {
    return normalizedCurrentValue;
  }

  if (!normalizedCurrentValue) {
    return normalizedTranscribedValue;
  }

  return `${normalizedCurrentValue} ${normalizedTranscribedValue}`;
}
