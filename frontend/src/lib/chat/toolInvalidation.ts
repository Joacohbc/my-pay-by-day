import type { QueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import {
  invalidateDomains,
  BROAD_FINANCE_DOMAINS,
  type CacheDomain,
} from '@/lib/cacheInvalidation';
import { CHAT_TOOL_MANIFEST, type ChatToolName } from '@/lib/chat/toolManifest.generated';

const COMPLETED_TOOL_STATES = new Set(['output-available', 'result']);

type ToolLikeUIPart = UIMessage['parts'][number] & {
  toolName?: string;
  state?: string;
  toolInvocation?: { state?: string; toolName?: string };
};

function isToolLikePart(part: UIMessage['parts'][number]): part is ToolLikeUIPart {
  return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
}

function toolNameOf(part: ToolLikeUIPart): string {
  return part.toolName || part.toolInvocation?.toolName || part.type.replace(/^tool-/, '');
}

function stateOf(part: ToolLikeUIPart): string | undefined {
  return part.state || part.toolInvocation?.state;
}

export function domainsForToolName(toolName: string): readonly CacheDomain[] {
  if (toolName in CHAT_TOOL_MANIFEST) return CHAT_TOOL_MANIFEST[toolName as ChatToolName].invalidates;
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
    
    const state = stateOf(part);
    if (!state || !COMPLETED_TOOL_STATES.has(state)) continue;
    
    for (const domain of domainsForToolName(toolNameOf(part))) {
      affectedDomains.add(domain);
    }
  }

  if (affectedDomains.size === 0) return;
  invalidateDomains(queryClient, [...affectedDomains]);
}
