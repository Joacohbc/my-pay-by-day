import type { QueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import {
  invalidateDomains,
  EVENT_MUTATION_DOMAINS,
  BROAD_FINANCE_DOMAINS,
  type CacheDomain,
} from '@/lib/cacheInvalidation';

const TOOL_DOMAINS: Record<string, readonly CacheDomain[]> = {
  createDraft: ['drafts'],
  updateDraft: ['drafts'],
  deleteDraft: ['drafts'],
  confirmDraft: EVENT_MUTATION_DOMAINS,
  updateEvent: EVENT_MUTATION_DOMAINS,
  saveMemory: ['aiMemory'],
  forgetMemory: ['aiMemory'],
  delegateTask: ['agentTasks'],
  startBackgroundTask: ['agentTasks'],
};

const READ_TOOL_NAMES = new Set([
  'listCategories',
  'listTags',
  'listTagGroups',
  'listNodes',
  'searchEvents',
  'getEvent',
  'listDrafts',
  'getDraft',
  'validateDraft',
  'showEntity',
  'getCurrentDateTime',
  'calculate',
  'recallMemory',
  'getTaskResult',
  'askUser',
]);

const COMPLETED_TOOL_STATES = new Set(['output-available', 'result']);

type ToolLikeUIPart = UIMessage['parts'][number] & {
  toolName?: string;
  state?: string;
};

function isToolLikePart(part: UIMessage['parts'][number]): part is ToolLikeUIPart {
  return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
}

function toolNameOf(part: ToolLikeUIPart): string {
  return part.toolName || part.type.replace(/^tool-/, '');
}

export function domainsForToolName(toolName: string): readonly CacheDomain[] {
  if (toolName in TOOL_DOMAINS) return TOOL_DOMAINS[toolName];
  if (READ_TOOL_NAMES.has(toolName)) return [];
  return BROAD_FINANCE_DOMAINS;
}

export function invalidateForToolResults(
  queryClient: QueryClient,
  message: UIMessage | undefined,
): void {
  if (!message) return;

  const affectedDomains = new Set<CacheDomain>();
  for (const part of message.parts) {
    if (!isToolLikePart(part)) continue;
    if (!part.state || !COMPLETED_TOOL_STATES.has(part.state)) continue;
    for (const domain of domainsForToolName(toolNameOf(part))) {
      affectedDomains.add(domain);
    }
  }

  if (affectedDomains.size === 0) return;
  invalidateDomains(queryClient, [...affectedDomains]);
}
