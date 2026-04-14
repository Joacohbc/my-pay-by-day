import { api } from '@/services/api';
import type { SelectableEntityType, UsageStats } from '@/models';


export const selectionHistoryService = {
  record: (entityType: SelectableEntityType, entityId: number) =>
    api.post<void>('/selection-history', { entityType, entityId }),
  
  getStats: (entityType: SelectableEntityType) =>
    api.get<UsageStats[]>(`/selection-history?entityType=${entityType}`),
};
