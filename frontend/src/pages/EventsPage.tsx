import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '@/hooks/useEvents';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useDebounce } from '@/hooks/useDebounce';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { useSearchParamsBatch } from '@/hooks/useSearchParamsState';
import type { ParamConfig } from '@/hooks/useSearchParamsState';
import { TemplatePickerModal } from '@/components/events/TemplatePickerModal';
import { PendingEventsSync } from '@/components/events/PendingEventsSync';
import type { Template, EventType } from '@/models';
import { EventCard } from '@/components/events/EventCard';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatCurrencyShort, eventNetAmount } from '@/lib/format';
import type { DateField } from '@/services/events.service';

type FilterType = 'ALL' | EventType | 'DRAFT';

const FILTER_PARAMS = {
  page: { key: 'page', defaultValue: 0, type: 'number' },
  search: { key: 'q', defaultValue: '', type: 'string' },
  filter: { key: 'type', defaultValue: 'ALL', type: 'string' },
  startDate: { key: 'from', defaultValue: '', type: 'string' },
  endDate: { key: 'to', defaultValue: '', type: 'string' },
  dateField: { key: 'df', defaultValue: 'TRANSACTION', type: 'string' },
  categoryId: { key: 'cat', defaultValue: 0, type: 'number' },
  tagId: { key: 'tag', defaultValue: 0, type: 'number' }
} satisfies Record<string, ParamConfig>;

export function EventsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { values, setValues, clearAll } = useSearchParamsBatch(FILTER_PARAMS);

  const page = values.page as number | undefined;
  const search = values.search as string;
  const filter = (values.filter || 'ALL') as FilterType;
  const startDate = values.startDate as string;
  const endDate = values.endDate as string;
  const dateField = (values.dateField || 'TRANSACTION') as DateField;
  const categoryId = values.categoryId ? Number(values.categoryId) : undefined;
  const tagId = values.tagId ? Number(values.tagId) : undefined;

  const debouncedSearch = useDebounce(search, 500);

  const [showPicker, setShowPicker] = useState(false);

  const hasAdvancedFilters = Boolean(startDate || endDate || categoryId || tagId || (dateField !== 'TRANSACTION'));
  const hasActiveFilters = Boolean(search || filter !== 'ALL' || hasAdvancedFilters);
  const [showFilters, setShowFilters] = useState(hasAdvancedFilters);

  const setPage = useCallback((p: number) => setValues({ page: p }), [setValues]);
  const setSearch = useCallback((s: string) => setValues({ search: s, page: 0 }), [setValues]);
  const setFilter = useCallback((f: string) => setValues({ filter: f, page: 0 }), [setValues]);
  const setStartDate = useCallback((d: string) => setValues({ startDate: d, page: 0 }), [setValues]);
  const setEndDate = useCallback((d: string) => setValues({ endDate: d, page: 0 }), [setValues]);
  const setDateField = useCallback((d: string) => setValues({ dateField: d, page: 0 }), [setValues]);
  const setCategoryId = useCallback((id: number) => setValues({ categoryId: id, page: 0 }), [setValues]);
  const setTagId = useCallback((id: number) => setValues({ tagId: id, page: 0 }), [setValues]);

  const clearFilters = useCallback(() => clearAll(), [clearAll]);

  const toggleFilters = useCallback(() => {
    if (showFilters) {
      // Closing: clear advanced filters
      setValues({ startDate: '', endDate: '', dateField: 'TRANSACTION', categoryId: 0, tagId: 0, page: 0 });
    }
    setShowFilters(prev => !prev);
  }, [showFilters, setValues]);

  const { data: paged, isLoading: isEventsLoading, error: eventsError } = useEvents({
    page,
    size: 20,
    search: debouncedSearch,
    startDate,
    endDate,
    dateField,
    type: filter !== 'ALL' && filter !== 'DRAFT' ? (filter as EventType) : undefined,
    categoryId,
    tagId,
  }, {
    enabled: filter !== 'DRAFT',
  });

  const { data: draftEvents, isLoading: isDraftsLoading, error: draftsError } = useFinanceEventDrafts();

  const { data: categoriesResponse } = useCategories();
  const categories = Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse?.content || []);

  const { data: tagsResponse } = useTags();
  const tags = Array.isArray(tagsResponse) ? tagsResponse : (tagsResponse?.content || []);

  const handlePickTemplate = (template: Template | null) => {
    setShowPicker(false);
    if (template) {
      navigate('/events/new', { state: { template } });
    } else {
      navigate('/events/new');
    }
  };

  const isDraftFilter = filter === 'DRAFT';

  const filteredDrafts = useMemo(
    () => isDraftFilter && draftEvents
      ? draftEvents.filter(d =>
          !debouncedSearch ||
          d.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      : [],
    [isDraftFilter, draftEvents, debouncedSearch]
  );

  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmAll = async () => {
    if (!filteredDrafts.length || isConfirming) return;
    setIsConfirming(true);
    try {
      const { eventsService } = await import('@/services/events.service');
      const { draftsService } = await import('@/services/drafts.service');
      // Process drafts sequentially to avoid overwhelming the backend
      for (const draft of filteredDrafts) {
        if (!draft.id || !draft.draftId) continue;
        const creationPayload = {
          ...draft,
          id: undefined, // remove front-end id logic or draft id to let backend create
          draftId: undefined
        };
        await eventsService.create(creationPayload as unknown as import('@/models').CreateEventDto);
        await draftsService.delete(draft.draftId);
      }
      // Refresh the page or invalidate queries
      window.location.reload(); 
    } catch (err) {
      console.error('Failed to confirm all drafts', err);
      alert(t('common.error'));
      setIsConfirming(false);
    }
  };

  const allEvents = useMemo(
    () => isDraftFilter ? filteredDrafts : (paged?.content ?? []),
    [isDraftFilter, filteredDrafts, paged]
  );
  const totalPages = isDraftFilter ? 1 : (paged?.totalPages ?? 1);
  const totalElements = isDraftFilter ? filteredDrafts.length : (paged?.totalElements ?? 0);

  const isLoading = isDraftFilter ? isDraftsLoading : isEventsLoading;
  const error = isDraftFilter ? draftsError : eventsError;

  const totalIncome = useMemo(() =>
    allEvents
      .filter((e) => e.type === 'INBOUND')
      .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0),
    [allEvents]
  );

  const totalExpenses = useMemo(() =>
    allEvents
      .filter((e) => e.type === 'OUTBOUND')
      .reduce((s, e) => s + Math.abs(eventNetAmount(e)), 0),
    [allEvents]
  );

  const filterBtns: { label: string; value: FilterType }[] = [
    { label: t('common.all'), value: 'ALL' },
    { label: t('drafts.title'), value: 'DRAFT' },
    { label: t('events.income'), value: 'INBOUND' },
    { label: t('events.expenses'), value: 'OUTBOUND' },
    { label: t('events.transfers'), value: 'OTHER' },
  ];

  if (isLoading && !allEvents.length) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('events.title')}
        subtitle={t('events.eventsCount', { count: totalElements })}
        action={
          <div className="flex gap-2">
            {isDraftFilter && filteredDrafts.length > 0 && (
              <Button size="sm" variant="secondary" onClick={handleConfirmAll} disabled={isConfirming}>
                <Icon name="check_all" className="text-sm" />
                {isConfirming ? t('common.loading') : t('drafts.confirmAll')}
              </Button>
            )}
            <Button size="sm" onClick={() => setShowPicker(true)}>
              <Icon name="add" className="text-sm" />
              {t('common.new')}
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 px-5">
        <Card className="text-center">
          <p className="text-xs text-dn-text-muted mb-1">{t('events.income')}</p>
          <p className="text-lg font-mono font-semibold text-dn-success">{formatCurrencyShort(totalIncome)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-dn-text-muted mb-1">{t('events.expenses')}</p>
          <p className="text-lg font-mono font-semibold text-dn-text-main">{formatCurrencyShort(totalExpenses)}</p>
        </Card>
      </div>

      {/* Pending offline events */}
      <PendingEventsSync />

      {/* Search and Filters Toggle */}
      <div className="px-5 flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-xl" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('events.searchPlaceholder')}
            className="w-full bg-dn-surface-low rounded-input pl-10 pr-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30 [color-scheme:dark]"
          />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          className="shrink-0 aspect-square p-0 w-4 flex items-center justify-center rounded-input"
          onClick={toggleFilters}
        >
          { showFilters ?
            <Icon name="filter_alt_off" className="text-xl" />
            : <Icon name="filter_alt" className="text-xl" />}
        </Button>
      </div>

      {/* Filters View */}
      {showFilters && (
        <div className="space-y-4 rounded-3xl p-4 mx-5 border border-white/5">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-dn-text-main">{t('common.filters')}</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-dn-primary font-medium hover:text-dn-primary/80"
              >
                {t('common.clearFilters')}
              </button>
            )}
          </div>

          <div className="space-y-3">
            <SearchableSelect
              label={t('events.dateField')}
              value={dateField}
              options={[
                { value: 'TRANSACTION', label: t('events.dateFieldTransaction') },
                { value: 'CREATED', label: t('events.dateFieldCreated') },
                { value: 'UPDATED', label: t('events.dateFieldUpdated') },
              ]}
              onChange={(val) => setDateField((val || 'TRANSACTION') as string)}
              placeholder={t('events.dateField')}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label={t('events.startDate')}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                label={t('events.endDate')}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SearchableSelect
                label={t('common.category')}
                value={categoryId}
                options={[
                  { value: '', label: t('common.all') },
                  ...categories.map(c => ({ value: c.id, label: c.name }))
                ]}
                onChange={(val) => setCategoryId(val ? Number(val) : 0)}
                placeholder={t('common.category')}
              />
              <SearchableSelect
                label={t('common.tag')}
                value={tagId}
                options={[
                  { value: '', label: t('common.all') },
                  ...tags.map(t => ({ value: t.id, label: t.name }))
                ]}
                onChange={(val) => setTagId(val ? Number(val) : 0)}
                placeholder={t('common.tag')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filterBtns.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={[
              'shrink-0 px-4 py-1.5 rounded-pill text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
              filter === value
                ? 'bg-dn-primary/20 text-dn-primary'
                : 'bg-dn-surface-low text-dn-text-muted hover:bg-dn-surface',
            ].join(' ')}
          >
            {label}
            {value === 'DRAFT' && draftEvents && draftEvents.length > 0 && (
              <span className="bg-dn-error text-white text-[10px] leading-tight font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center inline-block animate-pulse">
                {draftEvents.length}
              </span>
            )}
          </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div className="px-5">
        {allEvents.length === 0 ? (
          <EmptyState
            title={t('events.noEventsFound')}
            description={search ? t('events.noEventsFoundSearch') : t('events.noEventsFoundCreate')}
            action={
              <Button size="sm" onClick={() => setShowPicker(true)}>
                <Icon name="add" className="text-sm" />
                {t('events.newEvent')}
              </Button>
            }
          />
        ) : (
          <Card className="divide-y divide-white/5">
            {allEvents.map((event) => (
              <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                <EventCard event={event} />
              </div>
            ))}
          </Card>
        )}
      </div>

      <Pagination page={page ?? 0} totalPages={totalPages} onPageChange={setPage} />

      <TemplatePickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handlePickTemplate}
      />
    </div>
  );
}
