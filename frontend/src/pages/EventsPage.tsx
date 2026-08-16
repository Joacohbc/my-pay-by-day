import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { Routes, saveEventsSearch, saveEventsScrollTop, getEventsScrollTop } from '@/lib/routes';
import { useEvents, useEventsSummary } from '@/hooks/useEvents';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useDebounce, useDebounceCallback } from '@/hooks/useDebounce';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { useDuplicates } from '@/hooks/useDuplicates';
import { useSearchParamsBatch } from '@/hooks/useSearchParamsState';
import type { ParamConfig } from '@/hooks/useSearchParamsState';
import { useEventGroupPlans } from '@/hooks/useEventGroupPlans';
import { useCreatePaymentPlan, useAddEventToGroupPlan } from '@/hooks/usePaymentPlans';
import { useAlert } from '@/contexts/AlertContext';
import { TemplatePickerModal } from '@/components/events/TemplatePickerModal';
import { PendingEventsSync } from '@/components/events/PendingEventsSync';
import { MergeEventsModal } from '@/components/events/MergeEventsModal';
import { BulkUpdateEventsModal } from '@/components/events/BulkUpdateEventsModal';
import { GroupableEventCard } from '@/components/events/GroupableEventCard';
import { EventGroupFolderCard } from '@/components/events/EventGroupFolderCard';
import type { Template, EventType, FinanceEvent, PaymentPlan } from '@/models';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { EventsPageActions } from '@/components/events/EventsPageActions';
import {
  EventsListView,
  type AdvancedFiltersState,
} from '@/components/events/EventsListView';
import { formatCurrencyShort, formatDate, getLocalizedTodayString } from '@/lib/format';
import type { DateField } from '@/services/events.service';
import { useAccumulatedData } from '@/hooks/useAccumulatedData';

type FilterType = 'ALL' | EventType;

const EVENTS_PAGE_SIZE = 20;

interface EventsPageQuery {
  requestPage: number;
  requestSize: number;
  accumulationPage: number;
}

/**
 * A page restored from the URL (e.g. returning from an event's detail view after
 * scrolling past page 0) needs every item from page 0 through it, not just its own
 * slice — otherwise that range is unreachable by scrolling up. `restoredPage` only
 * ever grows while scrolling, so once `currentPage` passes it this collapses back
 * to a normal single-page request with no extra state to track the transition.
 */
function resolveEventsPageQuery(currentPage: number, restoredPage: number): EventsPageQuery {
  const isWithinRestoredRange = currentPage <= restoredPage;

  if (isWithinRestoredRange) {
    return {
      requestPage: 0,
      requestSize: (restoredPage + 1) * EVENTS_PAGE_SIZE,
      accumulationPage: 0,
    };
  }

  return {
    requestPage: currentPage,
    requestSize: EVENTS_PAGE_SIZE,
    accumulationPage: currentPage,
  };
}

function countTotalPages(totalElements: number): number {
  return totalElements ? Math.ceil(totalElements / EVENTS_PAGE_SIZE) : 1;
}

interface EventGroupRun {
  plan: PaymentPlan;
  members: FinanceEvent[];
}

interface EventGroupRuns {
  /** The event list with every run of 2+ consecutive same-group rows collapsed down to its first member. */
  displayEvents: FinanceEvent[];
  /** Anchor event id (the run's first member) → the full run, for rows that collapsed. */
  runByAnchorEventId: Map<number, EventGroupRun>;
}

/**
 * A run of same-group rows only reads well as a folder when it is unbroken — scattered members of
 * the same plan elsewhere in the list stay individual (their shared stripe color is enough there).
 * This walks the already-sorted event list once and only folds strictly consecutive runs.
 */
function computeEventGroupRuns(events: FinanceEvent[], planByEventId: Map<number, PaymentPlan>): EventGroupRuns {
  const displayEvents: FinanceEvent[] = [];
  const runByAnchorEventId = new Map<number, EventGroupRun>();

  let index = 0;
  while (index < events.length) {
    const event = events[index];
    const plan = planByEventId.get(event.id);
    displayEvents.push(event);

    if (!plan) {
      index++;
      continue;
    }

    const members = [event];
    let next = index + 1;
    while (next < events.length && planByEventId.get(events[next].id)?.id === plan.id) {
      members.push(events[next]);
      next++;
    }
    if (members.length > 1) {
      runByAnchorEventId.set(event.id, { plan, members });
    }
    index = next;
  }

  return { displayEvents, runByAnchorEventId };
}

function nextGroupInstallmentNumber(plan: PaymentPlan): number {
  return (plan.items ?? []).reduce((max, item) => Math.max(max, item.installmentNumber), 0) + 1;
}

function toDateOnly(dateTime: string): string {
  return dateTime.slice(0, 10);
}

const EVENTS_SCROLL_CONTAINER_ID = 'app-scroll-container';
const SCROLL_POSITION_SAVE_DELAY_MS = 150;

function getEventsScrollContainer(): HTMLElement | null {
  return document.getElementById(EVENTS_SCROLL_CONTAINER_ID);
}

/** Tracks whether `elementRef` is currently scrolled into view within the events scroll container. */
function useIsElementInView(elementRef: RefObject<HTMLElement | null>, hasContent: boolean) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!hasContent) return;
    const element = elementRef.current;
    const container = getEventsScrollContainer();
    if (!element || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { root: container, threshold: 0 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, hasContent]);

  return isVisible;
}

/** Restores the list's scroll offset once its content is ready, then keeps it saved as the user scrolls. */
function useRestoredScrollPosition(hasContentToRestore: boolean) {
  const hasRestoredRef = useRef(false);

  useLayoutEffect(() => {
    if (hasRestoredRef.current || !hasContentToRestore) return;
    const container = getEventsScrollContainer();
    if (!container) return;

    container.scrollTop = getEventsScrollTop();
    hasRestoredRef.current = true;
  }, [hasContentToRestore]);

  const persistScrollPosition = useDebounceCallback(() => {
    const container = getEventsScrollContainer();
    if (container) saveEventsScrollTop(container.scrollTop);
  }, SCROLL_POSITION_SAVE_DELAY_MS);

  useEffect(() => {
    const container = getEventsScrollContainer();
    if (!container) return;

    container.addEventListener('scroll', persistScrollPosition, { passive: true });
    return () => container.removeEventListener('scroll', persistScrollPosition);
  }, [persistScrollPosition]);
}

const FILTER_PARAMS = {
  page: { key: 'page', defaultValue: 0, type: 'number' },
  search: { key: 'q', defaultValue: '', type: 'string' },
  filter: { key: 'type', defaultValue: 'ALL', type: 'string' },
  startDate: { key: 'from', defaultValue: '', type: 'string' },
  endDate: { key: 'to', defaultValue: '', type: 'string' },
  dateField: { key: 'df', defaultValue: 'TRANSACTION', type: 'string' },
  categoryIds: { key: 'cats', defaultValue: '', type: 'string' },
  tagIds: { key: 'tags', defaultValue: '', type: 'string' },
  mergeIds: { key: 'mergeIds', defaultValue: '', type: 'string' },
  nodeId: { key: 'node', defaultValue: '', type: 'string' },
  minAmount: { key: 'minAmt', defaultValue: '', type: 'string' },
  maxAmount: { key: 'maxAmt', defaultValue: '', type: 'string' },
} satisfies Record<string, ParamConfig>;

export function EventsPage() {
  const { t } = useTranslation();
  const { navigate, navigatePush } = useAppNavigation();
  const location = useLocation();
  const alert = useAlert();

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
    categoryIdsStr = '',
    tagIdsStr = '',
    mergeIdsStr = '',
    nodeIdStr = '',
    minAmountStr = '',
    maxAmountStr = '',
  } = useMemo(() => ({
    page: values.page as number | undefined,
    search: values.search as string,
    filter: (values.filter || 'ALL') as FilterType,
    startDate: values.startDate as string,
    endDate: values.endDate as string,
    dateField: (values.dateField || 'TRANSACTION') as DateField,
    categoryIdsStr: values.categoryIds as string,
    tagIdsStr: values.tagIds as string,
    mergeIdsStr: values.mergeIds as string,
    nodeIdStr: values.nodeId as string,
    minAmountStr: values.minAmount as string,
    maxAmountStr: values.maxAmount as string,
  }), [values]);

  const categoryIdsArr = useMemo(
    () => (categoryIdsStr ? categoryIdsStr.split(',').map(Number).filter(Boolean) : []),
    [categoryIdsStr]
  );
  const nodeIdNum = useMemo(() => (nodeIdStr ? Number(nodeIdStr) : undefined), [nodeIdStr]);
  const minAmountNum = useMemo(() => (minAmountStr ? Number(minAmountStr) : undefined), [minAmountStr]);
  const maxAmountNum = useMemo(() => (maxAmountStr ? Number(maxAmountStr) : undefined), [maxAmountStr]);

  const tagIdsArr = useMemo(
    () => (tagIdsStr ? tagIdsStr.split(',').map(Number).filter(Boolean) : []),
    [tagIdsStr]
  );

  const debouncedSearch = useDebounce(search, 500);

  // --- 2. Advanced Filters State ---
  const advancedFilters = useMemo<AdvancedFiltersState>(
    () => ({ startDate, endDate, dateField, categoryIds: categoryIdsArr, tagIds: tagIdsArr, nodeId: nodeIdNum, minAmount: minAmountNum, maxAmount: maxAmountNum }),
    [startDate, endDate, dateField, categoryIdsArr, tagIdsArr, nodeIdNum, minAmountNum, maxAmountNum]
  );

  const setAdvancedFilters = useCallback(
    (next: AdvancedFiltersState) =>
      setValues({
        startDate: next.startDate,
        endDate: next.endDate,
        dateField: next.dateField,
        categoryIds: next.categoryIds.length ? next.categoryIds.join(',') : '',
        tagIds: next.tagIds.length ? next.tagIds.join(',') : '',
        nodeId: next.nodeId ? String(next.nodeId) : '',
        minAmount: next.minAmount !== undefined ? String(next.minAmount) : '',
        maxAmount: next.maxAmount !== undefined ? String(next.maxAmount) : '',
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
      navigatePush(Routes.EVENT_NEW, { template });
    } else {
      navigatePush(Routes.EVENT_NEW);
    }
  };

  // --- 4. Data Fetching ---
  const [restoredPage] = useState(page);
  const eventsPageQuery = resolveEventsPageQuery(page, restoredPage);

  const eventFilters = useMemo(
    () => ({
      search: debouncedSearch,
      startDate,
      endDate,
      dateField,
      type: filter !== 'ALL' ? (filter as EventType) : undefined,
      categoryIds: categoryIdsArr.length ? categoryIdsArr : undefined,
      tagIds: tagIdsArr.length ? tagIdsArr : undefined,
      nodeId: nodeIdNum,
      minAmount: minAmountNum,
      maxAmount: maxAmountNum,
    }),
    [debouncedSearch, startDate, endDate, dateField, filter, categoryIdsArr, tagIdsArr, nodeIdNum, minAmountNum, maxAmountNum]
  );

  const { data: paged, isLoading, error } = useEvents({
    ...eventFilters,
    page: eventsPageQuery.requestPage,
    size: eventsPageQuery.requestSize,
  });

  const { data: summary } = useEventsSummary(eventFilters);

  const { displayedData: events } = useAccumulatedData(
    paged?.content,
    eventsPageQuery.accumulationPage,
    setPage,
    [debouncedSearch, filter, startDate, endDate, dateField, categoryIdsStr, tagIdsStr, nodeIdStr, minAmountStr, maxAmountStr]
  );

  useRestoredScrollPosition(events.length > 0);

  // --- 5. Drag-to-group (long-press an event card onto another to form/extend a GROUP plan) ---
  const { planByEventId } = useEventGroupPlans();
  const createGroupPlan = useCreatePaymentPlan();
  const addEventToGroup = useAddEventToGroupPlan();

  const { displayEvents, runByAnchorEventId } = useMemo(
    () => computeEventGroupRuns(events, planByEventId),
    [events, planByEventId]
  );

  const addEventToPlan = useCallback(
    (plan: PaymentPlan, eventToAdd: FinanceEvent) => {
      addEventToGroup.mutate({
        planId: plan.id,
        dto: {
          installmentNumber: nextGroupInstallmentNumber(plan),
          expectedDate: toDateOnly(eventToAdd.transactionDate),
          itemStatus: 'PAID',
          eventId: eventToAdd.id,
        },
      });
    },
    [addEventToGroup]
  );

  const handleDropEvent = useCallback(
    (sourceEventId: number, targetEventId: number) => {
      const sourceEvent = events.find((e) => e.id === sourceEventId);
      const targetEvent = events.find((e) => e.id === targetEventId);
      if (!sourceEvent || !targetEvent) return;

      const sourcePlan = planByEventId.get(sourceEventId);
      const targetPlan = planByEventId.get(targetEventId);

      if (sourcePlan && targetPlan) {
        if (sourcePlan.id !== targetPlan.id) {
          alert.error(t('events.group.alreadyGrouped'));
        }
        return;
      }
      if (sourcePlan) {
        addEventToPlan(sourcePlan, targetEvent);
        return;
      }
      if (targetPlan) {
        addEventToPlan(targetPlan, sourceEvent);
        return;
      }

      createGroupPlan.mutate({
        name: t('events.group.defaultName', { name: targetEvent.name || t('drafts.untitledDraft') }),
        planType: 'GROUP',
        startDate: getLocalizedTodayString(),
        isAutomated: false,
        autoCreateDraft: false,
        generateItems: false,
        eventIds: [sourceEventId, targetEventId],
      });
    },
    [events, planByEventId, addEventToPlan, createGroupPlan, alert, t]
  );

  const renderEventRow = useCallback(
    (event: FinanceEvent, iconSource: 'category' | 'node') => {
      const run = runByAnchorEventId.get(event.id);
      if (run) {
        return <EventGroupFolderCard plan={run.plan} members={run.members} iconSource={iconSource} />;
      }
      return (
        <GroupableEventCard
          event={event}
          iconSource={iconSource}
          groupPlan={planByEventId.get(event.id)}
          onDropEvent={handleDropEvent}
        />
      );
    },
    [runByAnchorEventId, planByEventId, handleDropEvent]
  );

  const { data: draftEvents } = useFinanceEventDrafts();
  const draftsCount = draftEvents?.length ?? 0;

  const { data: pendingDuplicates } = useDuplicates('FINANCE_EVENT', 'PENDING');
  const duplicatesCount = pendingDuplicates?.length ?? 0;

  const totalElements = paged?.totalElements ?? 0;
  const totalPages = countTotalPages(totalElements);

  const totalIncome = summary?.income ?? 0;
  const totalExpenses = summary?.outbound ?? 0;
  const totalTransfers = summary?.transfers ?? 0;

  const cardsGridRef = useRef<HTMLDivElement>(null);
  const areCardsVisible = useIsElementInView(cardsGridRef, events.length > 0);

  const loadedDateRange = useMemo(() => {
    if (events.length === 0) return null;
    return {
      from: events[events.length - 1].transactionDate,
      to: events[0].transactionDate,
    };
  }, [events]);

  if (error) {
    return (
      <div className="px-5 py-4 text-dn-error text-sm">{String(error)}</div>
    );
  }

  const showStickyTotals = !areCardsVisible && !!loadedDateRange;

  return (
    <div className="space-y-4">
      {loadedDateRange && (
        <div
          className={`sticky top-0 z-20 grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
            showStickyTotals ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 bg-dn-bg/95 backdrop-blur-sm border-b border-dn-border px-4 sm:px-5 py-1.5 flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-3 text-xs sm:text-sm font-mono font-semibold">
              <span className="text-dn-success">{formatCurrencyShort(totalIncome)}</span>
              <span className="text-dn-text-main">{formatCurrencyShort(totalExpenses)}</span>
              <span className="text-dn-text-main">{formatCurrencyShort(totalTransfers)}</span>
            </div>
            <p className="text-[10px] text-dn-text-muted">
              {formatDate(loadedDateRange.from)} – {formatDate(loadedDateRange.to)}
              {events.length < totalElements && (
                <> · {t('events.loadedOfTotal', { loaded: events.length, total: totalElements })}</>
              )}
            </p>
          </div>
        </div>
      )}

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

      <div ref={cardsGridRef} className="grid grid-cols-3 gap-2 px-4 sm:gap-3 sm:px-5">
        <Card padding={false} className="p-3 sm:p-4 text-center min-w-0 flex flex-col justify-center">
          <p className="text-[10px] sm:text-xs text-dn-text-muted mb-1 truncate" title={t('events.income')}>{t('events.income')}</p>
          <p className="text-sm sm:text-lg font-mono font-semibold text-dn-success break-all">
            {formatCurrencyShort(totalIncome)}
          </p>
        </Card>
        <Card padding={false} className="p-3 sm:p-4 text-center min-w-0 flex flex-col justify-center">
          <p className="text-[10px] sm:text-xs text-dn-text-muted mb-1 truncate" title={t('events.expenses')}>{t('events.expenses')}</p>
          <p className="text-sm sm:text-lg font-mono font-semibold text-dn-text-main break-all">
            {formatCurrencyShort(totalExpenses)}
          </p>
        </Card>
        <Card padding={false} className="p-3 sm:p-4 text-center min-w-0 flex flex-col justify-center">
          <p className="text-[10px] sm:text-xs text-dn-text-muted mb-1 truncate" title={t('events.transfers')}>{t('events.transfers')}</p>
          <p className="text-sm sm:text-lg font-mono font-semibold text-dn-text-main break-all">
            {formatCurrencyShort(totalTransfers)}
          </p>
        </Card>
      </div>

      {loadedDateRange && (
        <p className="px-4 sm:px-5 -mt-2 text-[10px] sm:text-xs text-dn-text-muted text-center">
          {formatDate(loadedDateRange.from)} – {formatDate(loadedDateRange.to)}
          {events.length < totalElements && (
            <> · {t('events.loadedOfTotal', { loaded: events.length, total: totalElements })}</>
          )}
        </p>
      )}

      <PendingEventsSync />

      <EventsListView
        events={displayEvents}
        renderItem={renderEventRow}
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
        pills={{ active: filter, onChange: setFilter, position: 'inline' }}
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
