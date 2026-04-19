import type { SelectableEntityType } from '@/models/index';

export type DuplicateRecordStatus = 'PENDING' | 'RESOLVED_MERGED' | 'ACCEPTED_NOT_DUPLICATE';

export interface DuplicateRecord {
  id: number;
  entityType: SelectableEntityType;
  entityId1: number;
  entityId2: number;
  status: DuplicateRecordStatus;
  score: number;
  calculatedAt: string;
  entity1?: Record<string, unknown>;
  entity2?: Record<string, unknown>;
}

export interface DuplicateEventRecord extends DuplicateRecord {
  dateScore: number;
  amountScore: number;
  nodeScore: number;
  categoryScore: number;
  tagScore: number;
  nameScore: number;
}

export interface DuplicateDetectionSettings {
  id: number;
  eventTimeThresholdMinutes: number;
  eventAmountWeight: number;
  eventNodeWeight: number;
  eventCategoryWeight: number;
  eventTagWeight: number;
  eventNameWeight: number;
  eventTotalThresholdScore: number;
  textSimilarityThresholdScore: number;
}

export interface ResolveDuplicateRequest {
  action: DuplicateRecordStatus;
  keepEntityId?: number;
}
