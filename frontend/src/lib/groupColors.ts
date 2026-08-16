/**
 * A GROUP plan has no color field of its own, so its identity color is derived from its id
 * against this fixed, dark-surface-validated 8-hue set (see `--color-dn-group-*` in index.css).
 * Deterministic by id: the same plan always lands on the same slot, everywhere it renders.
 */
const GROUP_COLOR_VARS = [
  'var(--color-dn-group-1)',
  'var(--color-dn-group-2)',
  'var(--color-dn-group-3)',
  'var(--color-dn-group-4)',
  'var(--color-dn-group-5)',
  'var(--color-dn-group-6)',
  'var(--color-dn-group-7)',
  'var(--color-dn-group-8)',
] as const;

export function getGroupColor(planId: number): string {
  const slotIndex = Math.abs(planId) % GROUP_COLOR_VARS.length;
  return GROUP_COLOR_VARS[slotIndex];
}
