import { useState, useCallback } from 'react';
import type { DateField, EventFilters } from '@/services/events.service';

export interface EventModalFiltersState {
  tagIds: number[];
  categoryIds: number[];
  startDate: string;
  endDate: string;
  dateField: DateField;
  nodeId?: number;
}

const DEFAULT_FILTERS: EventModalFiltersState = {
  tagIds: [],
  categoryIds: [],
  startDate: '',
  endDate: '',
  dateField: 'TRANSACTION',
  nodeId: undefined,
};

export function useEventModalFilters(initial?: Partial<EventModalFiltersState>) {
  const resolved = { ...DEFAULT_FILTERS, ...initial };
  const [filters, setFilters] = useState<EventModalFiltersState>(resolved);

  const reset = useCallback(
    () => setFilters({ ...DEFAULT_FILTERS, ...initial }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const hasAnyFilter =
    filters.tagIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    !!filters.startDate ||
    !!filters.endDate ||
    !!filters.nodeId ||
    filters.dateField !== 'TRANSACTION';

  const toEventFilters = (): Omit<EventFilters, 'page' | 'search' | 'size' | 'type'> => ({
    tagIds: filters.tagIds.length ? filters.tagIds : undefined,
    categoryIds: filters.categoryIds.length ? filters.categoryIds : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    dateField: filters.dateField,
    nodeId: filters.nodeId,
  });

  const toggleTag = useCallback((id: number) => {
    setFilters((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((t) => t !== id)
        : [...prev.tagIds, id],
    }));
  }, []);

  const toggleCategory = useCallback((id: number) => {
    setFilters((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id],
    }));
  }, []);

  const setDateField = useCallback((f: DateField) => {
    setFilters((prev) => ({ ...prev, dateField: f }));
  }, []);

  const setStartDate = useCallback((d: string) => {
    setFilters((prev) => ({ ...prev, startDate: d }));
  }, []);

  const setEndDate = useCallback((d: string) => {
    setFilters((prev) => ({ ...prev, endDate: d }));
  }, []);

  const setNodeId = useCallback((id: number | undefined) => {
    setFilters((prev) => ({ ...prev, nodeId: id }));
  }, []);

  return {
    filters,
    setFilters,
    reset,
    hasAnyFilter,
    toEventFilters,
    toggleTag,
    toggleCategory,
    setDateField,
    setStartDate,
    setEndDate,
    setNodeId,
  };
}
