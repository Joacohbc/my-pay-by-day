import type { QueryClient } from '@tanstack/react-query';
import {
  eventKeys,
  draftKeys,
  duplicateKeys,
  nodeKeys,
  timePeriodKeys,
  categoryKeys,
  tagKeys,
  tagGroupKeys,
  fileKeys,
  memoryKeys,
  agentTaskKeys,
  subscriptionKeys,
  templateKeys,
} from '@/lib/queryKeys';

export type CacheDomain =
  | 'events'
  | 'drafts'
  | 'duplicates'
  | 'nodes'
  | 'timePeriods'
  | 'categories'
  | 'tags'
  | 'tagGroups'
  | 'files'
  | 'aiMemory'
  | 'agentTasks'
  | 'subscriptions'
  | 'templates';

const domainRootKeys: Record<CacheDomain, readonly unknown[]> = {
  events: eventKeys.all,
  drafts: draftKeys.all,
  duplicates: duplicateKeys.all,
  nodes: nodeKeys.all,
  timePeriods: timePeriodKeys.all,
  categories: categoryKeys.all,
  tags: tagKeys.all,
  tagGroups: tagGroupKeys.all,
  files: fileKeys.all,
  aiMemory: memoryKeys.all,
  agentTasks: agentTaskKeys.all,
  subscriptions: subscriptionKeys.all,
  templates: templateKeys.all,
};

export function invalidateDomains(
  queryClient: QueryClient,
  domains: readonly CacheDomain[],
): void {
  const uniqueDomains = new Set(domains);
  for (const domain of uniqueDomains) {
    queryClient.invalidateQueries({ queryKey: domainRootKeys[domain] });
  }
}

export const EVENT_MUTATION_DOMAINS: readonly CacheDomain[] = [
  'events',
  'drafts',
  'duplicates',
  'nodes',
  'timePeriods',
];

export const BROAD_FINANCE_DOMAINS: readonly CacheDomain[] = [
  ...EVENT_MUTATION_DOMAINS,
  'categories',
  'tags',
];
