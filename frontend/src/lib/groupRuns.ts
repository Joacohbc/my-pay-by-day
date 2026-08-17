import type { PaymentPlan } from '@/models';

export interface GroupRun<T> {
  plan: PaymentPlan;
  members: T[];
}

export interface GroupRunsResult<T> {
  /** The item list with every run of 2+ consecutive same-plan rows collapsed down to its first member. */
  displayItems: T[];
  /** Anchor item id (the run's first member) → the full run, for rows that collapsed. */
  runByAnchorId: Map<number, GroupRun<T>>;
}

/**
 * A run of same-plan rows only reads well as a folder when it is unbroken — scattered members of
 * the same plan elsewhere in the list stay individual (their shared stripe color is enough there).
 * This walks the already-sorted item list once and only folds strictly consecutive runs, so it
 * applies equally to confirmed events and drafts as long as both supply an id and a plan lookup.
 */
export function computeGroupRuns<T>(
  items: T[],
  planById: Map<number, PaymentPlan>,
  getId: (item: T) => number
): GroupRunsResult<T> {
  const displayItems: T[] = [];
  const runByAnchorId = new Map<number, GroupRun<T>>();

  let index = 0;
  while (index < items.length) {
    const item = items[index];
    const plan = planById.get(getId(item));
    displayItems.push(item);

    if (!plan) {
      index++;
      continue;
    }

    const members = [item];
    let next = index + 1;
    while (next < items.length && planById.get(getId(items[next]))?.id === plan.id) {
      members.push(items[next]);
      next++;
    }
    if (members.length > 1) {
      runByAnchorId.set(getId(item), { plan, members });
    }
    index = next;
  }

  return { displayItems, runByAnchorId };
}
