import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Routes, saveEventsSearch } from '@/lib/routes';
import { useEvents } from '@/hooks/useEvents';
import { useDebounce } from '@/hooks/useDebounce';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { useDuplicates } from '@/hooks/useDuplicates';
import { useSearchParamsBatch } from '@/hooks/useSearchParamsState';
import type { ParamConfig } from '@/hooks/useSearchParamsState';
import { TemplatePickerModal } from '@/components/events/TemplatePickerModal';
import { PendingEventsSync } from '@/components/events/PendingEventsSync';
import { MergeEventsModal } from '@/components/events/MergeEventsModal';
import { BulkUpdateEventsModal } from '@/components/events/BulkUpdateEventsModal';
import type { Template, EventType } from '@/models';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { EventsPageActions } from '@/components/events/EventsPageActions';
import {
  EventsListView,
  type AdvancedFiltersState,
} from '@/components/events/EventsListView';
import { formatCurrencyShort, eventNetAmount } from '@/lib/format';
import type { DateField } from '@/services/events.service';

type FilterType = 'ALL' | EventType;

const FILTER_PARAMS = {
  page: { key: 'page', defaultValue: 0, type: 'number' },
  search: { key: 'q', defaultValue: '', type: 'string' },
  filter: { key: 'type', defaultValue: 'ALL', type: 'string' },
  startDate: { key: 'from', defaultValue: '', type: 'string' },
  endDate: { key: 'to', defaultValue: '', type: 'string' },
  dateField: { key: 'df', defaultValue: 'TRANSACTION', type: 'string' },
  categoryId: { key: 'cat', defaultValue: 0, type: 'number' },
  tagId: { key: 'tag', defaultValue: 0, type: 'number' },
  mergeIds: { key: 'mergeIds', defaultValue: '', type: 'string' },
} satisfies Record<string, ParamConfig>;

export function EventsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // --- 1. URL State Management ---
  const { values, setValues, clearAll } = useSearchParamsBatch(FILTER_PARAMS);

  useEffect(() => {
    saveEventsSearch(location.search);
  }, [location.search]);

  // Read raw URL params
  const {
    page = 0,
    search = '',
    filter = 'ALL',
    startDate = '',
    endDate = '',
    dateField = 'TRANSACTION',
    categoryId,
    tagId,
    mergeIdsStr = '',
  } = useMemo(() => ({
    page: values.page as number | undefined,
    search: values.search as string,
    filter: (values.filter || 'ALL') as FilterType,
    startDate: values.startDate as string,
    endDate: values.endDate as string,
    dateField: (values.dateField || 'TRANSACTION') as DateField,
    categoryId: values.categoryId ? Number(values.categoryId) : undefined,
    tagId: values.tagId ? Number(values.tagId) : undefined,
    mergeIdsStr: values.mergeIds as string,
  }), [values]);

  const debouncedSearch = useDebounce(search, 500);

  // --- 2. Advanced Filters State ---
  const advancedFilters = useMemo<AdvancedFiltersState>(
    () => ({ startDate, endDate, dateField, categoryId, tagId }),
    [startDate, endDate, dateField, categoryId, tagId]
  );

  const setAdvancedFilters = useCallback(
    (next: AdvancedFiltersState) =>
      setValues({
        startDate: next.startDate,
        endDate: next.endDate,
        dateField: next.dateField,
        categoryId: next.categoryId ?? 0,
        tagId: next.tagId ?? 0,
        page: 0,
      }),
    [setValues]
  );

  const setPage = useCallback((p: number) => setValues({ page: p }), [setValues]);
  const setSearch = useCallback((s: string) => setValues({ search: s, page: 0 }), [setValues]);
  const setFilter = useCallback((f: string) => setValues({ filter: f, page: 0 }), [setValues]);
  const clearFilters = useCallback(() => clearAll(), [clearAll]);

  // --- 3. Modals State ---
  const [showPicker, setShowPicker] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);

  const initialMergeIds = useMemo(() => {
    return mergeIdsStr
      ? mergeIdsStr.split(',').map(Number).filter((n) => !isNaN(n))
      : [];
  }, [mergeIdsStr]);

  const isMergeModalOpen = showMerge || initialMergeIds.length > 0;

  const handleCloseMerge = useCallback(() => {
    setShowMerge(false);
    if (mergeIdsStr) {
      setValues({ mergeIds: '' });
    }
  }, [mergeIdsStr, setValues]);

  const handlePickTemplate = (template: Template | null) => {
    setShowPicker(false);
    if (template) {
      navigate(Routes.EVENT_NEW, { state: { template } });
    } else {
      navigate(Routes.EVENT_NEW);
    }
  };

  // --- 4. Data Fetching ---
  const { data: paged, isLoading, error } = useEvents({
    page,
    size: 20,
    search: debouncedSearch,
    startDate,
    endDate,
    dateField,
    type: filter !== 'ALL' ? (filter as EventType) : undefined,
    categoryId,
    tagId,
  });

  const { data: draftEvents } = useFinanceEventDrafts();
  const draftsCount = draftEvents?.length ?? 0;

  const { data: pendingDuplicates } = useDuplicates('FINANCE_EVENT', 'PENDING');
  const duplicatesCount = pendingDuplicates?.length ?? 0;

  const events = useMemo(() => paged?.content ?? [], [paged]);
  const totalPages = paged?.totalPages ?? 1;
  const totalElements = paged?.totalElements ?? 0;

  const totalIncome = useMemo(
    () =>
      events
        .filter((e) => e.type === 'INBOUND')
        .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0),
    [events]
  );

  const totalExpenses = useMemo(
    () =>
      events
        .filter((e) => e.type === 'OUTBOUND')
        .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0),
    [events]
  );

  const filterPills = [
    { label: t('common.all'), value: 'ALL' },
    { label: t('events.income'), value: 'INBOUND' },
    { label: t('events.expenses'), value: 'OUTBOUND' },
    { label: t('events.transfers'), value: 'OTHER' },
  ];

  if (error) {
    return (
      <div className="px-5 py-4 text-dn-error text-sm">{String(error)}</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('events.title')}
        subtitle={t('events.eventsCount', { count: totalElements })}
        action={
          <EventsPageActions
            draftsCount={draftsCount}
            duplicatesCount={duplicatesCount}
            onViewDrafts={() => navigate(Routes.EVENT_DRAFTS)}
            onMergeEvents={() => setShowMerge(true)}
            onBulkUpdate={() => setShowBulkUpdate(true)}
            onViewDuplicates={() => navigate(Routes.EVENTS_DUPLICATES)}
            onNewEvent={() => setShowPicker(true)}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 px-5">
        <Card className="text-center">
          <p className="text-xs text-dn-text-muted mb-1">{t('events.income')}</p>
          <p className="text-lg font-mono font-semibold text-dn-success">
            {formatCurrencyShort(totalIncome)}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-dn-text-muted mb-1">{t('events.expenses')}</p>
          <p className="text-lg font-mono font-semibold text-dn-text-main">
            {formatCurrencyShort(totalExpenses)}
          </p>
        </Card>
      </div>

      <PendingEventsSync />

      <EventsListView
        events={events}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('events.searchPlaceholder')}
        page={page ?? 0}
        totalPages={totalPages}
        onPageChange={setPage}
        advancedFilters={advancedFilters}
        onAdvancedFiltersChange={setAdvancedFilters}
        onClearFilters={clearFilters}
        filterPills={filterPills}
        activePill={filter}
        onPillChange={setFilter}
        emptyTitle={t('events.noEventsFound')}
        emptyDescription={
          search ? t('events.noEventsFoundSearch') : t('events.noEventsFoundCreate')
        }
        emptyAction={
          <Button size="sm" onClick={() => setShowPicker(true)}>
            <Icon name="add" className="text-sm" />
            {t('events.newEvent')}
          </Button>
        }
      />

      <TemplatePickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handlePickTemplate}
      />

      <MergeEventsModal
        open={isMergeModalOpen}
        initialMergeIds={initialMergeIds}
        onClose={handleCloseMerge}
      />

      <BulkUpdateEventsModal
        open={showBulkUpdate}
        onClose={() => setShowBulkUpdate(false)}
      />
    </div>
  );
}
