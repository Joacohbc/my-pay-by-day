import type { UsageStats } from '@/models';

export type SortMode = 'smart' | 'alphabetical' | 'frequency' | 'recency';


export function sortByUsage<T extends { id: number; name?: string; label?: string }>(
  items: T[],
  stats: UsageStats[],
  mode: SortMode = 'smart'
): T[] {
  const statsMap = new Map(stats.map((s) => [s.entityId, s]));

  return [...items].sort((a, b) => {
    const sa = statsMap.get(a.id);
    const sb = statsMap.get(b.id);

    const nameA = a.name || a.label || '';
    const nameB = b.name || b.label || '';

    switch (mode) {
      case 'alphabetical':
        return nameA.localeCompare(nameB);

      case 'frequency': {
        const totalA = (sa?.domainUsageCount ?? 0) + (sa?.selectionCount ?? 0);
        const totalB = (sb?.domainUsageCount ?? 0) + (sb?.selectionCount ?? 0);
        return totalB - totalA;
      }

      case 'recency': {
        const dateA = sa?.lastSelectedAt ? new Date(sa.lastSelectedAt).getTime() : 0;
        const dateB = sb?.lastSelectedAt ? new Date(sb.lastSelectedAt).getTime() : 0;
        return dateB - dateA;
      }

      case 'smart':
      default: {
        // Priority 1: Recency (last selected)
        const dateA = sa?.lastSelectedAt ? new Date(sa.lastSelectedAt).getTime() : 0;
        const dateB = sb?.lastSelectedAt ? new Date(sb.lastSelectedAt).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;

        // Priority 2: UI Selection count
        const selCountA = sa?.selectionCount ?? 0;
        const selCountB = sb?.selectionCount ?? 0;
        if (selCountA !== selCountB) return selCountB - selCountA;

        // Priority 3: Domain usage count
        const domCountA = sa?.domainUsageCount ?? 0;
        const domCountB = sb?.domainUsageCount ?? 0;
        if (domCountA !== domCountB) return domCountB - domCountA;

        // Fallback: Alphabetical
        return nameA.localeCompare(nameB);
      }
    }
  });
}
