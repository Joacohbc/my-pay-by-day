import { draftsService } from '@/services/drafts.service';
import { eventsService } from '@/services/events.service';
import type { FinanceEvent, MergePreview, MergeRequest } from '@/models';

export type MergeSourceKind = 'events' | 'drafts';

/** How the merge modal reads one kind of mergeable item: events by event id, drafts by draft id. */
export interface MergeSource {
  idOf: (item: FinanceEvent) => number;
  loadMany: (ids: number[]) => Promise<FinanceEvent[]>;
  previewMerge: (baseId: number, request: MergeRequest) => Promise<MergePreview>;
}

const draftIdOf = (draft: FinanceEvent): number => draft.draftId ?? draft.id;

export const MERGE_SOURCES: Record<MergeSourceKind, MergeSource> = {
  events: {
    idOf: (event) => event.id,
    loadMany: (ids) => Promise.all(ids.map((id) => eventsService.getById(id))),
    previewMerge: eventsService.previewMerge,
  },
  drafts: {
    idOf: draftIdOf,
    loadMany: async (ids) => {
      const drafts = await draftsService.getFinanceEventDrafts();
      const draftsById = new Map(drafts.map((draft) => [draftIdOf(draft), draft]));
      return ids.map((id) => draftsById.get(id)).filter((draft): draft is FinanceEvent => draft !== undefined);
    },
    previewMerge: draftsService.previewMerge,
  },
};
