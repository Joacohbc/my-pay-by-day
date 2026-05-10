import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvents, useBulkUpdateEvents } from '@/hooks/useEvents';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { useEventModalFilters } from '@/hooks/useEventModalFilters';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EventSelectionList } from '@/components/events/EventSelectionList';
import { EventSearchbarFilter, type EventSearchbarFilterHandle } from '@/components/events/EventSearchbarFilter';
import type { Category, Tag } from '@/models';

type BulkUpdateStep = 'select' | 'configure' | 'confirm';
type FieldMode = 'unchanged' | 'clear' | 'set';

export function BulkUpdateEventsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const bulkUpdate = useBulkUpdateEvents();

  const [step, setStep] = useState<BulkUpdateStep>('select');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const [categoryMode, setCategoryMode] = useState<FieldMode>('unchanged');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [tagsMode, setTagsMode] = useState<FieldMode>('unchanged');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  const {
    filters: eventFilters,
    hasAnyFilter,
    reset: resetFilters,
    toEventFilters,
    toggleTag: toggleFilterTag,
    toggleCategory: toggleFilterCategory,
    setDateField,
    setStartDate,
    setEndDate,
    setNodeId,
    setMinAmount,
    setMaxAmount,
  } = useEventModalFilters();

  const filterRef = useRef<EventSearchbarFilterHandle>(null);

  const combinedFilters = useMemo(
    () => ({ ...toEventFilters(), page, search }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventFilters, page, search]
  );

  const { data: pagedEvents, isLoading: eventsLoading, error: eventsError } = useEvents(combinedFilters);
  const { data: pagedCategories } = useCategories();
  const { data: pagedTags } = useTags();
  const { data: nodesPaged } = useNodes();

  const allEvents = useMemo(() => pagedEvents?.content ?? [], [pagedEvents]);
  const categories = useMemo(() => pagedCategories ?? [], [pagedCategories]);
  const tags = useMemo(() => pagedTags ?? [], [pagedTags]);
  const nodes = useMemo(() => nodesPaged ?? [], [nodesPaged]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const handleClose = () => {
    setStep('select');
    setPage(0);
    setSearch('');
    setSelectedEventIds(new Set());
    setCategoryMode('unchanged');
    setSelectedCategoryId(null);
    setTagsMode('unchanged');
    setSelectedTagIds(new Set());
    resetFilters();
    filterRef.current?.reset();
    setShowFilters(false);
    onClose();
  };

  const toggleFilters = () => {
    setShowFilters((v) => !v);
  };

  const handleToggleEvent = (id: number) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleTag = (id: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    const dto: {
      eventIds: number[];
      category?: { id: number } | null;
      tags?: { id: number }[] | null;
    } = {
      eventIds: Array.from(selectedEventIds),
    };

    if (categoryMode === 'clear') dto.category = null;
    else if (categoryMode === 'set' && selectedCategoryId !== null) dto.category = { id: selectedCategoryId };

    if (tagsMode === 'clear') dto.tags = null;
    else if (tagsMode === 'set') dto.tags = Array.from(selectedTagIds).map((id) => ({ id }));

    await bulkUpdate.mutateAsync(dto);
    handleClose();
  };

  const stepTitles: Record<BulkUpdateStep, string> = {
    select: t('events.bulkUpdateSelectTitle'),
    configure: t('events.bulkUpdateConfigureTitle'),
    confirm: t('events.bulkUpdateConfirmTitle'),
  };

  return (
    <Modal open={open} onClose={handleClose} title={stepTitles[step]}>
      <div className="space-y-4">

        {step === 'select' && (
          <>
            <EventSearchbarFilter
              ref={filterRef}
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(0);
              }}
              searchPlaceholder={t('events.searchPlaceholder')}
              showFilters={showFilters}
              hasAnyFilter={hasAnyFilter}
              filters={eventFilters}
              categories={categories}
              tags={tags}
              nodes={nodes}
              onToggleFilters={toggleFilters}
              onResetFilters={resetFilters}
              onToggleCategory={toggleFilterCategory}
              onToggleTag={toggleFilterTag}
              onDateFieldChange={setDateField}
              onDateRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }}
              onNodeIdChange={setNodeId}
              onMinAmountChange={setMinAmount}
              onMaxAmountChange={setMaxAmount}
              onFiltersChange={() => setPage(0)}
            >
              <EventSelectionList
                events={allEvents}
                isLoading={eventsLoading}
                error={eventsError}
                emptyStateTitle={search || hasAnyFilter ? t('events.noEventsFoundSearch') : t('events.noEventsFound')}
                onSelectEvent={(event) => handleToggleEvent(event.id)}
                selectionIndicator="checkbox"
                selectedIds={selectedEventIds}
                maxHeightClass="max-h-[40vh]"
                pagination={{
                  page,
                  totalPages: pagedEvents?.totalPages ?? 1,
                  onPageChange: setPage,
                  hideWhenSearching: false,
                }}
              />
            </EventSearchbarFilter>

            {selectedEventIds.size > 0 && (
              <p className="text-xs text-dn-primary font-medium px-1">
                {t('events.selectedCount', { count: selectedEventIds.size })}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose}>{t('common.cancel')}</Button>
              <Button
                onClick={() => setStep('configure')}
                disabled={selectedEventIds.size === 0}
              >
                {t('common.next')}
              </Button>
            </div>
          </>
        )}

        {step === 'configure' && (
          <ConfigureStep
            categories={categories}
            tags={tags}
            categoryMode={categoryMode}
            selectedCategoryId={selectedCategoryId}
            tagsMode={tagsMode}
            selectedTagIds={selectedTagIds}
            onCategoryModeChange={setCategoryMode}
            onSelectCategory={setSelectedCategoryId}
            onTagsModeChange={setTagsMode}
            onToggleTag={handleToggleTag}
            onBack={() => setStep('select')}
            onNext={() => setStep('confirm')}
            t={t}
          />
        )}

        {step === 'confirm' && (
          <ConfirmStep
            eventCount={selectedEventIds.size}
            categoryMode={categoryMode}
            selectedCategory={selectedCategory}
            tagsMode={tagsMode}
            selectedTagIds={selectedTagIds}
            tags={tags}
            isPending={bulkUpdate.isPending}
            onBack={() => setStep('configure')}
            onConfirm={handleConfirm}
            t={t}
          />
        )}
      </div>
    </Modal>
  );
}

function ConfigureStep({
  categories,
  tags,
  categoryMode,
  selectedCategoryId,
  tagsMode,
  selectedTagIds,
  onCategoryModeChange,
  onSelectCategory,
  onTagsModeChange,
  onToggleTag,
  onBack,
  onNext,
  t,
}: {
  categories: Category[];
  tags: Tag[];
  categoryMode: FieldMode;
  selectedCategoryId: number | null;
  tagsMode: FieldMode;
  selectedTagIds: Set<number>;
  onCategoryModeChange: (mode: FieldMode) => void;
  onSelectCategory: (id: number | null) => void;
  onTagsModeChange: (mode: FieldMode) => void;
  onToggleTag: (id: number) => void;
  onBack: () => void;
  onNext: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const activeCats = categories.filter((c) => !c.archived);
  const activeTags = tags.filter((tag) => !tag.archived);

  return (
    <>
      {/* Category section */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-dn-text-muted uppercase tracking-wide px-1">
          {t('events.bulkUpdateCategory')}
        </p>
        <div className="rounded-2xl border border-dn-border bg-dn-surface divide-y divide-white/5">
          <FieldModeRow
            mode="unchanged"
            current={categoryMode}
            label={t('events.bulkUpdateNoChange')}
            onClick={() => onCategoryModeChange('unchanged')}
          />
          <FieldModeRow
            mode="clear"
            current={categoryMode}
            label={t('events.bulkUpdateClear')}
            onClick={() => onCategoryModeChange('clear')}
          />
        </div>

        {categoryMode !== 'unchanged' && categoryMode !== 'clear' && activeCats.length === 0 && (
          <p className="text-xs text-dn-text-muted px-1">{t('common.noItems')}</p>
        )}

        {activeCats.length > 0 && (
          <div className="rounded-2xl border border-dn-border bg-dn-surface divide-y divide-white/5 max-h-[30vh] overflow-y-auto">
            {activeCats.map((cat) => {
              const selected = categoryMode === 'set' && selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onCategoryModeChange('set');
                    onSelectCategory(cat.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dn-primary/5 transition-colors text-left"
                >
                  <RadioDot selected={selected} />
                  {cat.icon && <Icon name={cat.icon} className="text-base text-dn-text-muted shrink-0" />}
                  <span className="text-sm text-dn-text-main">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tags section */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-dn-text-muted uppercase tracking-wide px-1">
          {t('events.bulkUpdateTags')}
        </p>
        <div className="rounded-2xl border border-dn-border bg-dn-surface divide-y divide-white/5">
          <FieldModeRow
            mode="unchanged"
            current={tagsMode}
            label={t('events.bulkUpdateNoChange')}
            onClick={() => onTagsModeChange('unchanged')}
          />
          <FieldModeRow
            mode="clear"
            current={tagsMode}
            label={t('events.bulkUpdateClearTags')}
            onClick={() => onTagsModeChange('clear')}
          />
        </div>

        {activeTags.length > 0 && (
          <>
            <p className="text-xs text-dn-text-muted px-1">{t('events.bulkUpdateTagsHint')}</p>
            <div className="rounded-2xl border border-dn-border bg-dn-surface divide-y divide-white/5 max-h-[30vh] overflow-y-auto">
              {activeTags.map((tag) => {
                const selected = tagsMode === 'set' && selectedTagIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      onTagsModeChange('set');
                      onToggleTag(tag.id);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dn-primary/5 transition-colors text-left"
                  >
                    <CheckBox checked={selected} />
                    <span className="text-sm text-dn-text-main">{tag.name}</span>
                  </button>
                );
              })}
            </div>
            {tagsMode === 'set' && selectedTagIds.size > 0 && (
              <p className="text-xs text-dn-primary font-medium px-1">
                {t('events.selectedCount', { count: selectedTagIds.size })}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>{t('common.back')}</Button>
        <Button
          onClick={onNext}
          disabled={categoryMode === 'unchanged' && tagsMode === 'unchanged'}
        >
          {t('common.next')}
        </Button>
      </div>
    </>
  );
}

function ConfirmStep({
  eventCount,
  categoryMode,
  selectedCategory,
  tagsMode,
  selectedTagIds,
  tags,
  isPending,
  onBack,
  onConfirm,
  t,
}: {
  eventCount: number;
  categoryMode: FieldMode;
  selectedCategory: Category | null;
  tagsMode: FieldMode;
  selectedTagIds: Set<number>;
  tags: Tag[];
  isPending: boolean;
  onBack: () => void;
  onConfirm: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const selectedTagNames = tags.filter((tag) => selectedTagIds.has(tag.id)).map((tag) => tag.name);

  return (
    <>
      <div className="rounded-2xl border border-dn-border bg-dn-surface divide-y divide-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <Icon name="edit_note" className="text-dn-primary text-base shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-dn-text-muted">{t('events.bulkUpdateEvents')}</p>
            <p className="text-sm font-medium text-dn-text-main">
              {t('events.eventsCount', { count: eventCount })}
            </p>
          </div>
        </div>

        {categoryMode !== 'unchanged' && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Icon name="category" className="text-dn-primary text-base shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dn-text-muted">{t('events.bulkUpdateCategory')}</p>
              <p className="text-sm text-dn-text-main">
                {categoryMode === 'clear'
                  ? <span className="italic text-dn-text-muted">{t('events.bulkUpdateClear')}</span>
                  : selectedCategory?.name ?? '—'}
              </p>
            </div>
          </div>
        )}

        {tagsMode !== 'unchanged' && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Icon name="label" className="text-dn-primary text-base shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dn-text-muted">{t('events.bulkUpdateTags')}</p>
              <p className="text-sm text-dn-text-main">
                {tagsMode === 'clear'
                  ? <span className="italic text-dn-text-muted">{t('events.bulkUpdateClearTags')}</span>
                  : selectedTagNames.length > 0
                    ? selectedTagNames.join(', ')
                    : <span className="italic text-dn-text-muted">{t('events.bulkUpdateClearTags')}</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>{t('common.back')}</Button>
        <Button onClick={onConfirm} disabled={isPending}>
          {isPending ? t('common.loading') : t('events.bulkUpdateConfirmAction')}
        </Button>
      </div>
    </>
  );
}

function FieldModeRow({
  mode,
  current,
  label,
  onClick,
}: {
  mode: FieldMode;
  current: FieldMode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dn-primary/5 transition-colors text-left"
    >
      <RadioDot selected={current === mode} />
      <span className="text-sm text-dn-text-main">{label}</span>
    </button>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div className={[
      'shrink-0 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors',
      selected ? 'border-dn-primary bg-dn-primary' : 'border-dn-text-muted',
    ].join(' ')}>
      {selected && <Icon name="check" className="text-xs text-white" />}
    </div>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <div className={[
      'shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors',
      checked ? 'border-dn-primary bg-dn-primary' : 'border-dn-text-muted',
    ].join(' ')}>
      {checked && <Icon name="check" className="text-xs text-white" />}
    </div>
  );
}
