type ArchivedSelectable = {
  id?: number;
  archived?: boolean;
};

export function prependMissingArchived<T extends ArchivedSelectable>(
  activeItems: T[],
  candidateItems: T[],
): T[] {
  if (candidateItems.length === 0) return activeItems;

  const activeIds = new Set(activeItems.map(item => item.id).filter(id => id !== undefined));
  const archivedItemsById = new Map<number, T>();

  for (const candidateItem of candidateItems) {
    if (!candidateItem.archived || candidateItem.id === undefined) continue;
    if (activeIds.has(candidateItem.id)) continue;
    if (archivedItemsById.has(candidateItem.id)) continue;
    archivedItemsById.set(candidateItem.id, candidateItem);
  }

  if (archivedItemsById.size === 0) return activeItems;

  return [...archivedItemsById.values(), ...activeItems];
}