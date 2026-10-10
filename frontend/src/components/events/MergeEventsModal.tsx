import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useMergeEvents } from '@/hooks/useEvents';
import { useMergeDrafts } from '@/hooks/useDrafts';
import { useNodes } from '@/hooks/useNodes';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { MergeSourcePicker } from '@/components/events/MergeSourcePicker';
import { MERGE_SOURCES, type MergeSourceKind } from '@/components/events/mergeSources';
import { formatMoney, eventCurrency, eventNetAmount } from '@/lib/format';
import { mergePreviewKeys } from '@/lib/queryKeys';
import { Routes } from '@/lib/routes';
import { aiService } from '@/services/ai.service';
import { useAlert } from '@/contexts/AlertContext';
import type { Category, FinanceEvent, FinanceLineItem, MergePreview, MergeRequest, Tag } from '@/models';
import { logger } from '@/lib/logger';

type MergeStep = 'select-base' | 'select-sources' | 'configure-grouping' | 'configure-meta' | 'confirm';

const nodeIdsOf = (events: FinanceEvent[]) =>
  new Set(events.flatMap((event) => event.lineItems.map((lineItem) => lineItem.financeNodeId)));

/**
 * Merges events into a base event, or drafts into one new event. Both run the same steps and the
 * same backend rules; `source` only decides where the items come from and which endpoints apply.
 * Items passed in `initialMergeIds` are already chosen: the first is the base and the selection
 * steps are skipped.
 */
export function MergeEventsModal({
  open,
  source = 'events',
  initialMergeIds = [],
  onClose,
}: {
  open: boolean;
  source?: MergeSourceKind;
  initialMergeIds?: number[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { navigatePush } = useAppNavigation();
  const alert = useAlert();
  const mergeEvents = useMergeEvents();
  const mergeDrafts = useMergeDrafts();
  const commitMerge = source === 'drafts' ? mergeDrafts : mergeEvents;
  const mergeSource = MERGE_SOURCES[source];
  const { idOf } = mergeSource;
  const { data: nodes } = useNodes();
  const { data: knownCategories } = useCategories();
  const { data: knownTags } = useTags();
  const isPreselected = initialMergeIds.length > 0;

  const [step, setStep] = useState<MergeStep>('select-base');
  const [baseEvent, setBaseEvent] = useState<FinanceEvent | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<number>>(new Set());
  const [groupByNodeIds, setGroupByNodeIds] = useState<Set<number>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [mergedName, setMergedName] = useState('');
  const [mergedDescription, setMergedDescription] = useState('');
  const [isMergingDescriptions, setIsMergingDescriptions] = useState(false);
  const [extraEvents, setExtraEvents] = useState<FinanceEvent[]>([]);

  useEffect(() => {
    if (open && initialMergeIds.length > 0 && extraEvents.length === 0) {
      mergeSource.loadMany(initialMergeIds)
        .then((fetched) => {
          if (fetched.length > 0) {
            setBaseEvent(fetched[0]);
            setExtraEvents(fetched);
            setSelectedSourceIds(new Set(fetched.slice(1).map(idOf)));
            setGroupByNodeIds(nodeIdsOf(fetched));
            setStep('configure-grouping');
          }
        })
        .catch((error) => logger.child('mergeEvents').error('Failed to load items to merge', { error, source, mergeIdCount: initialMergeIds.length }));
    }
  }, [open, initialMergeIds, extraEvents.length, mergeSource, idOf, source]);

  const handleClose = () => {
    setStep('select-base');
    setBaseEvent(null);
    setSelectedSourceIds(new Set());
    setGroupByNodeIds(new Set());
    setSelectedCategoryId(null);
    setSelectedTagIds(new Set());
    setMergedName('');
    setMergedDescription('');
    setExtraEvents([]);
    onClose();
  };

  const handleSelectBase = (event: FinanceEvent) => {
    setBaseEvent(event);
    setSelectedSourceIds(new Set());
    setExtraEvents([event]);
    setStep('select-sources');
  };

  const allEvents = useMemo(() => {
    const map = new Map<number, FinanceEvent>();
    extraEvents.forEach((e) => map.set(idOf(e), e));
    return Array.from(map.values());
  }, [extraEvents, idOf]);

  const sourceEvents = allEvents.filter((e) => selectedSourceIds.has(idOf(e)));

  const nodeNamesById = useMemo(() => new Map((nodes ?? []).map((node) => [node.id, node.name])), [nodes]);
  const nodeNameOf = (lineItem: FinanceLineItem) =>
    lineItem.financeNodeName || nodeNamesById.get(lineItem.financeNodeId) || `#${lineItem.financeNodeId}`;

  // Unique nodes across base + selected sources
  const allNodes = useMemo(() => {
    const nodeMap = new Map<number, string>();
    const addNodes = (event: FinanceEvent) => {
      for (const li of event.lineItems) {
        if (!nodeMap.has(li.financeNodeId)) {
          nodeMap.set(li.financeNodeId, li.financeNodeName || nodeNamesById.get(li.financeNodeId) || `#${li.financeNodeId}`);
        }
      }
    };
    if (baseEvent) addNodes(baseEvent);
    sourceEvents.forEach(addNodes);
    return Array.from(nodeMap.entries()).map(([id, name]) => ({ id, name }));
  }, [baseEvent, sourceEvents, nodeNamesById]);

  // Drafts store category and tag references by id alone, so their names come from the cached lists.
  const categoriesById = useMemo(() => new Map((knownCategories ?? []).map((category) => [category.id, category])), [knownCategories]);
  const tagsById = useMemo(() => new Map((knownTags ?? []).map((tag) => [tag.id, tag])), [knownTags]);

  // Unique categories across base + selected sources (excluding null)
  const allCategories = useMemo(() => {
    const catMap = new Map<number, Category>();
    const addCat = (event: FinanceEvent) => {
      if (!event.category || catMap.has(event.category.id)) return;
      const category = categoriesById.get(event.category.id) ?? event.category;
      catMap.set(category.id, { ...category, name: category.name || `#${category.id}` });
    };
    if (baseEvent) addCat(baseEvent);
    sourceEvents.forEach(addCat);
    return Array.from(catMap.values());
  }, [baseEvent, sourceEvents, categoriesById]);

  // Unique tags across base + selected sources
  const allTags = useMemo(() => {
    const tagMap = new Map<number, Tag>();
    const addTags = (event: FinanceEvent) => {
      for (const storedTag of event.tags ?? []) {
        if (tagMap.has(storedTag.id)) continue;
        const tag = tagsById.get(storedTag.id) ?? storedTag;
        tagMap.set(tag.id, { ...tag, name: tag.name || `#${tag.id}` });
      }
    };
    if (baseEvent) addTags(baseEvent);
    sourceEvents.forEach(addTags);
    return Array.from(tagMap.values());
  }, [baseEvent, sourceEvents, tagsById]);

  const mergeRequest: MergeRequest = useMemo(() => ({
    sourceIds: Array.from(selectedSourceIds),
    groupByNodeIds: Array.from(groupByNodeIds),
    categoryId: selectedCategoryId,
    tagIds: Array.from(selectedTagIds),
    name: mergedName,
    description: mergedDescription,
  }), [selectedSourceIds, groupByNodeIds, selectedCategoryId, selectedTagIds, mergedName, mergedDescription]);

  const baseId = baseEvent ? idOf(baseEvent) : null;
  const previewQuery = useQuery({
    queryKey: mergePreviewKeys.preview(source, baseId ?? 0, mergeRequest),
    queryFn: () => mergeSource.previewMerge(baseId as number, mergeRequest),
    enabled: open && step === 'confirm' && baseId !== null,
    staleTime: 0,
    gcTime: 0,
  });

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
      logger.child('mergeEvents').error('AI merge-description failed', { error: err, action: 'MERGE_DESCRIPTION', eventCount: sourceEvents.length + 1, baseEventId: baseId });
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

  const handleConfirmMerge = () => {
    if (baseId === null) return;
    commitMerge.mutate(
      { baseId, request: mergeRequest },
      {
        onSuccess: (merged) => {
          handleClose();
          navigatePush(Routes.EVENT_DETAIL(merged.id));
        },
      },
    );
  };

  const stepTitle: Record<MergeStep, string> = {
    'select-base': t('events.mergeSelectBase'),
    'select-sources': t('events.mergeSelectSources'),
    'configure-grouping': t('events.mergeConfigureGrouping'),
    'configure-meta': t('events.mergeConfigureMeta'),
    'confirm': t('events.mergeConfirm'),
  };

  const handleConfirmBaseSelection = async (selectedIds: Set<number>) => {
    const selectedBaseId = Array.from(selectedIds)[0];
    if (!selectedBaseId) return;
    const [selectedBaseEvent] = await mergeSource.loadMany([selectedBaseId]);
    if (selectedBaseEvent) handleSelectBase(selectedBaseEvent);
  };

  const handleConfirmSourceSelection = async (selectedIds: Set<number>) => {
    if (!baseEvent || baseId === null) return;
    const sourceIds = Array.from(selectedIds).filter((id) => id !== baseId);
    const selectedSources = await mergeSource.loadMany(sourceIds);
    setSelectedSourceIds(new Set(selectedSources.map(idOf)));
    setExtraEvents([baseEvent, ...selectedSources]);

    setGroupByNodeIds(nodeIdsOf([baseEvent, ...selectedSources]));
    setStep('configure-grouping');
  };

  if (isPreselected && !baseEvent) {
    return (
      <Modal open={open} onClose={handleClose} title={stepTitle['configure-grouping']}>
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      </Modal>
    );
  }

  if (step === 'select-base') {
    return (
      <MergeSourcePicker
        source={source}
        open={open}
        onClose={handleClose}
        title={stepTitle[step]}
        onConfirm={handleConfirmBaseSelection}
        confirmLabel={t('common.next')}
        maxSelection={1}
      />
    );
  }

  if (step === 'select-sources' && baseEvent && baseId !== null) {
    return (
      <MergeSourcePicker
        source={source}
        open={open}
        onClose={handleClose}
        onCancel={() => setStep('select-base')}
        title={stepTitle[step]}
        onConfirm={handleConfirmSourceSelection}
        confirmLabel={t('common.next')}
        cancelLabel={t('common.back')}
        initialSelectedIds={selectedSourceIds}
        excludeIds={new Set([baseId])}
        eventType={baseEvent.type}
      />
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={stepTitle[step]}>
      <div className="space-y-4">

        {step === 'configure-grouping' && (
          <ConfigureGroupingStep
            nodes={allNodes}
            groupByNodeIds={groupByNodeIds}
            onToggleNode={handleToggleNode}
            onBack={isPreselected ? handleClose : () => setStep('select-sources')}
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
            idOf={idOf}
            preview={previewQuery.data}
            isPreviewLoading={previewQuery.isLoading}
            previewErrorMessage={previewQuery.error instanceof Error ? previewQuery.error.message : undefined}
            nodeNameOf={nodeNameOf}
            warning={source === 'drafts'
              ? t('drafts.mergeWarning', { count: sourceEvents.length + 1 })
              : t('events.mergeWarning', { count: sourceEvents.length })}
            isPending={commitMerge.isPending}
            onBack={() => setStep('configure-meta')}
            onConfirm={handleConfirmMerge}
            t={t}
          />
        )}
      </div>
    </Modal>
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
  idOf,
  preview,
  isPreviewLoading,
  previewErrorMessage,
  nodeNameOf,
  warning,
  isPending,
  onBack,
  onConfirm,
  t,
}: {
  baseEvent: FinanceEvent;
  sourceEvents: FinanceEvent[];
  idOf: (item: FinanceEvent) => number;
  preview: MergePreview | undefined;
  isPreviewLoading: boolean;
  previewErrorMessage: string | undefined;
  nodeNameOf: (lineItem: FinanceLineItem) => string;
  warning: string;
  isPending: boolean;
  onBack: () => void;
  onConfirm: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const canConfirm = preview?.valid === true && !isPending;

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
          <div key={idOf(e)} className="flex items-center gap-3 p-3">
            <Icon name="merge" className="text-dn-text-muted text-base shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dn-text-main truncate">{e.name}</p>
              <p className="text-xs text-dn-text-muted">{formatMoney(Math.abs(eventNetAmount(e)), eventCurrency(e))}</p>
            </div>
          </div>
        ))}
      </div>

      <MergePreviewResult
        preview={preview}
        isLoading={isPreviewLoading}
        errorMessage={previewErrorMessage}
        nodeNameOf={nodeNameOf}
        t={t}
      />

      <p className="text-xs text-dn-text-muted px-1">{warning}</p>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>{t('common.back')}</Button>
        <Button variant="danger" onClick={onConfirm} disabled={!canConfirm}>
          {isPending ? t('common.loading') : t('events.mergeConfirmAction')}
        </Button>
      </div>
    </>
  );
}

function MergePreviewResult({
  preview,
  isLoading,
  errorMessage,
  nodeNameOf,
  t,
}: {
  preview: MergePreview | undefined;
  isLoading: boolean;
  errorMessage: string | undefined;
  nodeNameOf: (lineItem: FinanceLineItem) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }
  if (errorMessage) return <p className="text-xs text-dn-danger px-1">{errorMessage}</p>;
  if (!preview) return null;

  const { mergedEvent } = preview;
  const mergedCurrency = eventCurrency(mergedEvent);

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-dn-text-muted uppercase tracking-wide px-1">
          {t('events.mergeResultTitle')}
        </p>
        <div className="rounded-2xl bg-dn-surface-low divide-y divide-white/5">
          {mergedEvent.lineItems.map((lineItem, index) => (
            <div key={`${lineItem.financeNodeId}-${lineItem.currency}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm text-dn-text-main truncate">{nodeNameOf(lineItem)}</span>
              <span className="text-sm font-mono text-dn-text-main shrink-0">{formatMoney(lineItem.amount, lineItem.currency || mergedCurrency)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-dn-text-muted">{t('events.mergeTotalAmount')}</span>
            <span className="text-sm font-mono font-semibold text-dn-text-main">
              {formatMoney(Math.abs(eventNetAmount(mergedEvent)), mergedCurrency)}
            </span>
          </div>
        </div>
      </div>

      {!preview.valid && (
        <div className="space-y-1 px-1">
          <p className="text-xs font-semibold text-dn-danger">{t('events.mergePreviewErrors')}</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {preview.errors.map((error, index) => (
              <li key={`${error.field}-${index}`} className="text-xs text-dn-danger">{error.message}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
