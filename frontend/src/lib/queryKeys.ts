import type { EventFilters } from '@/services/events.service';
import type {
  FinanceNodeType,
  SelectableEntityType,
  DuplicateRecordStatus,
} from '@/models';

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (archived?: boolean) => [...categoryKeys.lists(), archived] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: number) => [...categoryKeys.details(), id] as const,
};

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (archived?: boolean) => [...tagKeys.lists(), archived] as const,
  details: () => [...tagKeys.all, 'detail'] as const,
  detail: (id: number) => [...tagKeys.details(), id] as const,
};

export const tagGroupKeys = {
  all: ['tag-groups'] as const,
  lists: () => [...tagGroupKeys.all, 'list'] as const,
  list: (archived?: boolean) => [...tagGroupKeys.lists(), archived] as const,
  details: () => [...tagGroupKeys.all, 'detail'] as const,
  detail: (id: number) => [...tagGroupKeys.details(), id] as const,
};

export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (page: number, size: number, orphaned?: boolean) =>
    [...fileKeys.lists(), { page, size, orphaned }] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (id: number) => [...fileKeys.details(), id] as const,
};

export const nodeKeys = {
  all: ['financeNodes'] as const,
  list: (archived?: boolean, type?: FinanceNodeType) => [...nodeKeys.all, archived, type] as const,
  detail: (id: number) => [...nodeKeys.all, id] as const,
  balance: (id: number) => [...nodeKeys.all, id, 'balance'] as const,
};

export const timePeriodKeys = {
  all: ['time-periods'] as const,
  list: (page: number, size: number) => [...timePeriodKeys.all, page, size] as const,
  balance: (id: number | null) => [...timePeriodKeys.all, id, 'balance'] as const,
  dynamicBalance: (startDate: string | null, endDate: string | null) =>
    [...timePeriodKeys.all, 'dynamic', startDate, endDate] as const,
};

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  list: (page: number, size: number) => [...subscriptionKeys.all, page, size] as const,
};

export const templateKeys = {
  all: ['templates'] as const,
  list: (page: number, size: number) => [...templateKeys.all, page, size] as const,
};

export const draftKeys = {
  all: ['drafts'] as const,
  byEntity: (entityId: number | null) => [...draftKeys.all, 'by-entity', entityId] as const,
};

export const duplicateKeys = {
  all: ['duplicates'] as const,
  byType: (type: SelectableEntityType, status: DuplicateRecordStatus) =>
    [...duplicateKeys.all, type, status] as const,
  byEntity: (type: SelectableEntityType, id: number, status: DuplicateRecordStatus) =>
    [...duplicateKeys.all, 'entity', type, id, status] as const,
  settings: ['duplicate-settings'] as const,
};

export const agentTaskKeys = {
  all: ['agent-tasks'] as const,
  lists: () => [...agentTaskKeys.all, 'list'] as const,
  list: (status?: string) => [...agentTaskKeys.lists(), { status }] as const,
  detail: (id: string) => [...agentTaskKeys.all, 'detail', id] as const,
};

export const memoryKeys = {
  all: ['ai-memory'] as const,
};

export const selectionHistoryKeys = {
  all: ['selection-history'] as const,
  byType: (entityType: string) => [...selectionHistoryKeys.all, entityType] as const,
};
