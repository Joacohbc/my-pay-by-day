import type { ChatMessage } from '@/store/chatStore';

export type ChatEntityAction = 'created' | 'updated' | 'shown';

export type ChatEntityRef =
  | { kind: 'event'; id: number; action: ChatEntityAction }
  | { kind: 'draft'; id: number; action: ChatEntityAction }
  | { kind: 'tag'; id: number; action: 'shown' }
  | { kind: 'category'; id: number; action: 'shown' };

type ToolCall = NonNullable<ChatMessage['toolCalls']>[number];

const isResultOutput = (tc: ToolCall): tc is ToolCall & { output: Record<string, unknown> } =>
  tc.state === 'result' &&
  typeof tc.output === 'object' &&
  tc.output !== null &&
  !('error' in (tc.output as Record<string, unknown>));

const RANK: Record<ChatEntityAction, number> = { shown: 0, updated: 1, created: 2 };

export function extractEntityRefs(toolCalls: ChatMessage['toolCalls']): ChatEntityRef[] {
  const refs = new Map<string, ChatEntityRef>();

  const upsert = (ref: ChatEntityRef) => {
    const key = `${ref.kind}:${ref.id}`;
    const existing = refs.get(key);
    if (existing && RANK[existing.action] > RANK[ref.action]) return;
    refs.set(key, ref);
  };
  const remove = (kind: ChatEntityRef['kind'], id: unknown) => {
    if (typeof id === 'number') refs.delete(`${kind}:${id}`);
  };

  for (const tc of toolCalls ?? []) {
    if (!isResultOutput(tc)) continue;
    const output = tc.output;

    switch (tc.name) {
      case 'createDraft':
        if (typeof output.draftId === 'number') upsert({ kind: 'draft', id: output.draftId, action: 'created' });
        break;
      case 'updateDraft':
        if (typeof output.draftId === 'number') upsert({ kind: 'draft', id: output.draftId, action: 'updated' });
        break;
      case 'confirmDraft':
        if (typeof output.id === 'number') upsert({ kind: 'event', id: output.id, action: 'created' });
        remove('draft', output.confirmedDraftId);
        break;
      case 'updateEvent':
        if (typeof output.id === 'number') upsert({ kind: 'event', id: output.id, action: 'updated' });
        break;
      case 'deleteDraft':
        remove('draft', output.deletedDraftId);
        break;
      case 'showEntity':
        if (typeof output.id === 'number' && typeof output.entityType === 'string') {
          const kind = output.entityType as ChatEntityRef['kind'];
          if (kind === 'event' || kind === 'draft' || kind === 'tag' || kind === 'category') {
            upsert({ kind, id: output.id, action: 'shown' } as ChatEntityRef);
          }
        }
        break;
      default:
        break;
    }
  }

  return [...refs.values()];
}
