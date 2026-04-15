import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEvents, useMergeEvents } from '@/hooks/useEvents';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { formatCurrency, eventNetAmount } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { aiService } from '@/services/ai.service';
import { useAlert } from '@/contexts/AlertContext';
import type { Category, FinanceEvent, Tag } from '@/models';

type MergeStep = 'select-base' | 'select-sources' | 'configure-grouping' | 'configure-meta' | 'confirm';

export function MergeEventsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const alert = useAlert();
  const mergeEvents = useMergeEvents();

  const [step, setStep] = useState<MergeStep>('select-base');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [baseEvent, setBaseEvent] = useState<FinanceEvent | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<number>>(new Set());
  const [groupByNodeIds, setGroupByNodeIds] = useState<Set<number>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [mergedName, setMergedName] = useState('');
  const [mergedDescription, setMergedDescription] = useState('');
  const [isMergingDescriptions, setIsMergingDescriptions] = useState(false);

  const { data: paged, isLoading, error } = useEvents({ page });

  const handleClose = () => {
    setStep('select-base');
    setBaseEvent(null);
    setSelectedSourceIds(new Set());
    setGroupByNodeIds(new Set());
    setSelectedCategoryId(null);
    setSelectedTagIds(new Set());
    setMergedName('');
    setMergedDescription('');
    setSearch('');
    setPage(0);
    onClose();
  };

  const handleSelectBase = (event: FinanceEvent) => {
    setBaseEvent(event);
    setSelectedSourceIds(new Set());
    setStep('select-sources');
  };

  const handleToggleSource = (id: number) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allEvents = paged?.content || [];
  const sourceEvents = allEvents.filter((e) => selectedSourceIds.has(e.id));

  // Unique nodes across base + selected sources
  const allNodes = useMemo(() => {
    const nodeMap = new Map<number, string>();
    const addNodes = (event: FinanceEvent) => {
      for (const li of event.lineItems) {
        if (!nodeMap.has(li.financeNodeId)) nodeMap.set(li.financeNodeId, li.financeNodeName);
      }
    };
    if (baseEvent) addNodes(baseEvent);
    sourceEvents.forEach(addNodes);
    return Array.from(nodeMap.entries()).map(([id, name]) => ({ id, name }));
  }, [baseEvent, sourceEvents]);

  // Unique categories across base + selected sources (excluding null)
  const allCategories = useMemo(() => {
    const catMap = new Map<number, Category>();
    const addCat = (event: FinanceEvent) => {
      if (event.category && !catMap.has(event.category.id)) catMap.set(event.category.id, event.category);
    };
    if (baseEvent) addCat(baseEvent);
    sourceEvents.forEach(addCat);
    return Array.from(catMap.values());
  }, [baseEvent, sourceEvents]);

  // Unique tags across base + selected sources
  const allTags = useMemo(() => {
    const tagMap = new Map<number, Tag>();
    const addTags = (event: FinanceEvent) => {
      for (const tag of event.tags) {
        if (!tagMap.has(tag.id)) tagMap.set(tag.id, tag);
      }
    };
    if (baseEvent) addTags(baseEvent);
    sourceEvents.forEach(addTags);
    return Array.from(tagMap.values());
  }, [baseEvent, sourceEvents]);

  const handleGoToGrouping = () => {
    setGroupByNodeIds(new Set(allNodes.map((n) => n.id)));
    setStep('configure-grouping');
  };

  const handleGoToMeta = () => {
    // Default: base event's name, description, category and union of all tags
    setMergedName(baseEvent?.name ?? '');
    setMergedDescription(baseEvent?.description ?? '');
    setSelectedCategoryId(baseEvent?.category?.id ?? null);
    setSelectedTagIds(new Set(allTags.map((t) => t.id)));
    setStep('configure-meta');
  };

  const handleMergeDescriptions = async () => {
    if (!baseEvent) return;
    setIsMergingDescriptions(true);
    try {
      const allDescriptions = [baseEvent, ...sourceEvents]
        .map((e, i) => `Event ${i + 1} — ${e.name}: ${e.description ?? '(no description)'}`)
        .join('\n');
      const result = await aiService.generateText({
        action: 'MERGE_DESCRIPTION',
        context: allDescriptions,
      });
      setMergedDescription(result.text);
    } catch (err) {
      alert.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsMergingDescriptions(false);
    }
  };

  const handleToggleNode = (id: number) => {
    setGroupByNodeIds((prev) => {
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

  const handleConfirmMerge = async () => {
    if (!baseEvent) return;
    const merged = await mergeEvents.mutateAsync({
      baseId: baseEvent.id,
      sourceIds: Array.from(selectedSourceIds),
      groupByNodeIds: Array.from(groupByNodeIds),
      categoryId: selectedCategoryId,
      tagIds: Array.from(selectedTagIds),
      name: mergedName,
      description: mergedDescription,
    });
    handleClose();
    navigate(Routes.EVENT_DETAIL(merged.id));
  };

  const baseFilteredEvents = allEvents.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const matchesName = e.name.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
    const matchesCategory = e.category?.name.toLowerCase().includes(q);
    return matchesName || matchesCategory;
  });

  const sourceFilteredEvents = baseFilteredEvents.filter((e) => {
    if (!baseEvent) return false;
    if (e.id === baseEvent.id) return false;
    if (e.type !== baseEvent.type) return false;
    return true;
  });

  const mergedTotal = baseEvent
    ? eventNetAmount(baseEvent) +
      Array.from(selectedSourceIds).reduce((sum, id) => {
        const found = allEvents.find((e) => e.id === id);
        return sum + (found ? eventNetAmount(found) : 0);
      }, 0)
    : 0;

  const stepTitle: Record<MergeStep, string> = {
    'select-base': t('events.mergeSelectBase'),
    'select-sources': t('events.mergeSelectSources'),
    'configure-grouping': t('events.mergeConfigureGrouping'),
    'configure-meta': t('events.mergeConfigureMeta'),
    'confirm': t('events.mergeConfirm'),
  };

  return (
    <Modal open={open} onClose={handleClose} title={stepTitle[step]}>
      <div className="space-y-4">

        {step === 'select-base' && (
          <SelectEventStep
            events={baseFilteredEvents}
            isLoading={isLoading}
            error={error}
            search={search}
            onSearchChange={setSearch}
            page={page}
            totalPages={paged?.totalPages ?? 1}
            onPageChange={setPage}
            onSelect={handleSelectBase}
            selectionIndicator="radio"
            selectedIds={new Set()}
            t={t}
          />
        )}

        {step === 'select-sources' && baseEvent && (
          <>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-dn-surface border border-dn-primary/30">
              <Icon name="flag" className="text-dn-primary text-base shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dn-text-muted">{t('events.mergeBaseEvent')}</p>
                <p className="text-sm font-medium text-dn-text-main truncate">{baseEvent.name}</p>
              </div>
              <button
                type="button"
                onClick={() => { setStep('select-base'); setSelectedSourceIds(new Set()); }}
                className="text-dn-text-muted hover:text-dn-primary transition-colors"
              >
                <Icon name="edit" className="text-base" />
              </button>
            </div>

            {sourceFilteredEvents.length === 0 && !isLoading ? (
              <EmptyState title={t('events.mergeNoCompatible')} />
            ) : (
              <SelectEventStep
                events={sourceFilteredEvents}
                isLoading={isLoading}
                error={error}
                search={search}
                onSearchChange={setSearch}
                page={page}
                totalPages={paged?.totalPages ?? 1}
                onPageChange={setPage}
                onSelect={(e) => handleToggleSource(e.id)}
                selectionIndicator="checkbox"
                selectedIds={selectedSourceIds}
                t={t}
              />
            )}

            {selectedSourceIds.size > 0 && (
              <p className="text-xs text-dn-primary font-medium px-1">
                {t('events.selectedCount', { count: selectedSourceIds.size })}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep('select-base')}>
                {t('common.back')}
              </Button>
              <Button onClick={handleGoToGrouping} disabled={selectedSourceIds.size === 0}>
                {t('common.next')}
              </Button>
            </div>
          </>
        )}

        {step === 'configure-grouping' && (
          <ConfigureGroupingStep
            nodes={allNodes}
            groupByNodeIds={groupByNodeIds}
            onToggleNode={handleToggleNode}
            onBack={() => setStep('select-sources')}
            onNext={handleGoToMeta}
            t={t}
          />
        )}

        {step === 'configure-meta' && baseEvent && (
          <ConfigureMetaStep
            name={mergedName}
            description={mergedDescription}
            isMergingDescriptions={isMergingDescriptions}
            onNameChange={setMergedName}
            onDescriptionChange={setMergedDescription}
            onMergeDescriptions={handleMergeDescriptions}
            categories={allCategories}
            tags={allTags}
            selectedCategoryId={selectedCategoryId}
            selectedTagIds={selectedTagIds}
            onSelectCategory={setSelectedCategoryId}
            onToggleTag={handleToggleTag}
            onBack={() => setStep('configure-grouping')}
            onNext={() => setStep('confirm')}
            t={t}
          />
        )}

        {step === 'confirm' && baseEvent && (
          <MergeConfirmStep
            baseEvent={baseEvent}
            sourceEvents={sourceEvents}
            mergedTotal={mergedTotal}
            isPending={mergeEvents.isPending}
            onBack={() => setStep('configure-meta')}
            onConfirm={handleConfirmMerge}
            t={t}
          />
        )}
      </div>
    </Modal>
  );
}

function SelectEventStep({
  events,
  isLoading,
  error,
  search,
  onSearchChange,
  page,
  totalPages,
  onPageChange,
  onSelect,
  selectionIndicator,
  selectedIds,
  t,
}: {
  events: FinanceEvent[];
  isLoading: boolean;
  error: unknown;
  search: string;
  onSearchChange: (s: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSelect: (e: FinanceEvent) => void;
  selectionIndicator: 'radio' | 'checkbox';
  selectedIds: Set<number>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <>
      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-xl" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('events.searchPlaceholder')}
          className="w-full bg-dn-surface-low rounded-input pl-10 pr-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30 scheme-dark"
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
        {isLoading && <div className="py-4 text-center"><Spinner /></div>}
        {!!error && (
          <div className="py-2 text-center text-dn-error text-sm">
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {!isLoading && !error && events.length === 0 && (
          <div className="py-4">
            <EmptyState title={search ? String(t('events.noEventsFoundSearch')) : String(t('events.noEventsFound'))} />
          </div>
        )}

        {events.map((evt) => {
          const isSelected = selectedIds.has(evt.id);
          return (
            <div
              key={evt.id}
              onClick={() => onSelect(evt)}
              className={[
                'border transition-colors cursor-pointer rounded-2xl flex items-center gap-2 pr-3',
                isSelected
                  ? 'border-dn-primary bg-dn-primary/5'
                  : 'border-transparent hover:border-dn-primary/50',
              ].join(' ')}
            >
              <div className="flex-1 min-w-0">
                <EventCard event={evt} disableLink />
              </div>
              <div className={[
                'shrink-0 w-5 h-5 border-2 flex items-center justify-center transition-colors',
                selectionIndicator === 'radio' ? 'rounded-full' : 'rounded',
                isSelected ? 'border-dn-primary bg-dn-primary' : 'border-dn-text-muted',
              ].join(' ')}>
                {isSelected && <Icon name="check" className="text-xs text-white" />}
              </div>
            </div>
          );
        })}
      </div>

      {!search && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}

function ConfigureGroupingStep({
  nodes,
  groupByNodeIds,
  onToggleNode,
  onBack,
  onNext,
  t,
}: {
  nodes: { id: number; name: string }[];
  groupByNodeIds: Set<number>;
  onToggleNode: (id: number) => void;
  onBack: () => void;
  onNext: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <>
      <p className="text-xs text-dn-text-muted px-1">{t('events.mergeGroupingHint')}</p>

      <div className="rounded-2xl border border-dn-border bg-dn-surface divide-y divide-white/5 max-h-[50vh] overflow-y-auto">
        {nodes.map((node) => {
          const grouped = groupByNodeIds.has(node.id);
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onToggleNode(node.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dn-primary/5 transition-colors text-left"
            >
              <div className={[
                'shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors',
                grouped ? 'border-dn-primary bg-dn-primary' : 'border-dn-text-muted',
              ].join(' ')}>
                {grouped && <Icon name="check" className="text-xs text-white" />}
              </div>
              <span className="text-sm text-dn-text-main">{node.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>{t('common.back')}</Button>
        <Button onClick={onNext}>{t('common.next')}</Button>
      </div>
    </>
  );
}

function ConfigureMetaStep({
  name,
  description,
  isMergingDescriptions,
  onNameChange,
  onDescriptionChange,
  onMergeDescriptions,
  categories,
  tags,
  selectedCategoryId,
  selectedTagIds,
  onSelectCategory,
  onToggleTag,
  onBack,
  onNext,
  t,
}: {
  name: string;
  description: string;
  isMergingDescriptions: boolean;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onMergeDescriptions: () => void;
  categories: Category[];
  tags: Tag[];
  selectedCategoryId: number | null;
  selectedTagIds: Set<number>;
  onSelectCategory: (id: number | null) => void;
  onToggleTag: (id: number) => void;
  onBack: () => void;
  onNext: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <>
      {/* Name */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-dn-text-muted uppercase tracking-wide px-1">
          {t('events.mergeMetaNameTitle')}
        </p>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-dn-surface-low rounded-input px-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-dn-text-muted uppercase tracking-wide">
            {t('events.mergeMetaDescriptionTitle')}
          </p>
          <button
            type="button"
            onClick={onMergeDescriptions}
            disabled={isMergingDescriptions}
            className="flex items-center gap-1.5 text-xs text-dn-primary hover:text-dn-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isMergingDescriptions ? (
              <Spinner size="sm" />
            ) : (
              <Icon name="auto_awesome" className="text-sm" />
            )}
            {t('events.mergeMetaMergeDescriptions')}
          </button>
        </div>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('events.mergeMetaDescriptionPlaceholder')}
          rows={3}
          className="w-full bg-dn-surface-low rounded-input px-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30 resize-none"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-dn-text-muted uppercase tracking-wide px-1">
          {t('events.mergeMetaCategoryTitle')}
        </p>
        <div className="rounded-2xl border border-dn-border bg-dn-surface divide-y divide-white/5">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dn-primary/5 transition-colors text-left"
          >
            <div className={[
              'shrink-0 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors',
              selectedCategoryId === null ? 'border-dn-primary bg-dn-primary' : 'border-dn-text-muted',
            ].join(' ')}>
              {selectedCategoryId === null && <Icon name="check" className="text-xs text-white" />}
            </div>
            <span className="text-sm text-dn-text-muted italic">{t('events.mergeMetaCategoryNone')}</span>
          </button>
          {categories.map((cat) => {
            const selected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dn-primary/5 transition-colors text-left"
              >
                <div className={[
                  'shrink-0 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors',
                  selected ? 'border-dn-primary bg-dn-primary' : 'border-dn-text-muted',
                ].join(' ')}>
                  {selected && <Icon name="check" className="text-xs text-white" />}
                </div>
                <span className="text-sm text-dn-text-main">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-dn-text-muted uppercase tracking-wide px-1">
            {t('events.mergeMetaTagsTitle')}
          </p>
          <p className="text-xs text-dn-text-muted px-1">{t('events.mergeMetaTagsHint')}</p>
          <div className="rounded-2xl border border-dn-border bg-dn-surface divide-y divide-white/5">
            {tags.map((tag) => {
              const selected = selectedTagIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onToggleTag(tag.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dn-primary/5 transition-colors text-left"
                >
                  <div className={[
                    'shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors',
                    selected ? 'border-dn-primary bg-dn-primary' : 'border-dn-text-muted',
                  ].join(' ')}>
                    {selected && <Icon name="check" className="text-xs text-white" />}
                  </div>
                  <span className="text-sm text-dn-text-main">{tag.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>{t('common.back')}</Button>
        <Button onClick={onNext}>{t('common.next')}</Button>
      </div>
    </>
  );
}

function MergeConfirmStep({
  baseEvent,
  sourceEvents,
  mergedTotal,
  isPending,
  onBack,
  onConfirm,
  t,
}: {
  baseEvent: FinanceEvent;
  sourceEvents: FinanceEvent[];
  mergedTotal: number;
  isPending: boolean;
  onBack: () => void;
  onConfirm: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <>
      <div className="rounded-2xl border border-dn-primary/30 bg-dn-surface divide-y divide-white/5">
        <div className="flex items-center gap-3 p-3">
          <Icon name="flag" className="text-dn-primary text-base shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-dn-text-muted">{t('events.mergeBaseEvent')}</p>
            <p className="text-sm font-medium text-dn-text-main truncate">{baseEvent.name}</p>
          </div>
        </div>
        {sourceEvents.map((e) => (
          <div key={e.id} className="flex items-center gap-3 p-3">
            <Icon name="merge" className="text-dn-text-muted text-base shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dn-text-main truncate">{e.name}</p>
              <p className="text-xs text-dn-text-muted">{formatCurrency(Math.abs(eventNetAmount(e)))}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-dn-surface-low p-3 flex items-center justify-between">
        <span className="text-sm text-dn-text-muted">{t('events.mergeTotalAmount')}</span>
        <span className="text-sm font-mono font-semibold text-dn-text-main">
          {formatCurrency(Math.abs(mergedTotal))}
        </span>
      </div>

      <p className="text-xs text-dn-text-muted px-1">
        {t('events.mergeWarning', { count: sourceEvents.length })}
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>{t('common.back')}</Button>
        <Button variant="danger" onClick={onConfirm} disabled={isPending}>
          {isPending ? t('common.loading') : t('events.mergeConfirmAction')}
        </Button>
      </div>
    </>
  );
}
