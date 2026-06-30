// ─── Icon color palette ─────────────────────────────────────────────────────
//
// Curated set of colors a user can assign to a Node or Category icon. The key is
// what gets persisted on the entity (`color` field); the classes are resolved at
// render time. Class strings are written out in full so Tailwind's JIT scanner
// can detect them — do NOT build them dynamically (e.g. `bg-${c}-400/15`).

export interface IconColorOption {
  /** Persisted palette key (e.g. "blue"). */
  key: string;
  /** Container tint + icon color, applied to the rounded icon badge. */
  containerClass: string;
  /** Solid swatch color, used by the color picker buttons. */
  swatchClass: string;
}

export const ICON_COLORS: IconColorOption[] = [
  { key: 'slate', containerClass: 'bg-slate-400/15 text-slate-300', swatchClass: 'bg-slate-400' },
  { key: 'red', containerClass: 'bg-red-400/15 text-red-300', swatchClass: 'bg-red-400' },
  { key: 'orange', containerClass: 'bg-orange-400/15 text-orange-300', swatchClass: 'bg-orange-400' },
  { key: 'amber', containerClass: 'bg-amber-400/15 text-amber-300', swatchClass: 'bg-amber-400' },
  { key: 'yellow', containerClass: 'bg-yellow-400/15 text-yellow-300', swatchClass: 'bg-yellow-400' },
  { key: 'lime', containerClass: 'bg-lime-400/15 text-lime-300', swatchClass: 'bg-lime-400' },
  { key: 'emerald', containerClass: 'bg-emerald-400/15 text-emerald-300', swatchClass: 'bg-emerald-400' },
  { key: 'teal', containerClass: 'bg-teal-400/15 text-teal-300', swatchClass: 'bg-teal-400' },
  { key: 'cyan', containerClass: 'bg-cyan-400/15 text-cyan-300', swatchClass: 'bg-cyan-400' },
  { key: 'sky', containerClass: 'bg-sky-400/15 text-sky-300', swatchClass: 'bg-sky-400' },
  { key: 'blue', containerClass: 'bg-blue-400/15 text-blue-300', swatchClass: 'bg-blue-400' },
  { key: 'indigo', containerClass: 'bg-indigo-400/15 text-indigo-300', swatchClass: 'bg-indigo-400' },
  { key: 'violet', containerClass: 'bg-violet-400/15 text-violet-300', swatchClass: 'bg-violet-400' },
  { key: 'purple', containerClass: 'bg-purple-400/15 text-purple-300', swatchClass: 'bg-purple-400' },
  { key: 'fuchsia', containerClass: 'bg-fuchsia-400/15 text-fuchsia-300', swatchClass: 'bg-fuchsia-400' },
  { key: 'pink', containerClass: 'bg-pink-400/15 text-pink-300', swatchClass: 'bg-pink-400' },
  { key: 'rose', containerClass: 'bg-rose-400/15 text-rose-300', swatchClass: 'bg-rose-400' },
];

const COLOR_MAP = new Map(ICON_COLORS.map((c) => [c.key, c]));

/** Resolves a palette key to its container classes, or undefined for unknown/empty keys. */
export function getIconColorClass(key?: string | null): string | undefined {
  if (!key) return undefined;
  return COLOR_MAP.get(key)?.containerClass;
}

/** Resolves a palette key to its solid swatch class, or undefined for unknown/empty keys. */
export function getIconSwatchClass(key?: string | null): string | undefined {
  if (!key) return undefined;
  return COLOR_MAP.get(key)?.swatchClass;
}
