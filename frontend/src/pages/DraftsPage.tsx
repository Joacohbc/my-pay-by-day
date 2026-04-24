import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Routes } from '@/lib/routes';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useFinanceEventDrafts,
  useDeleteAllDrafts,
  useDeleteDraft,
  DRAFTS_KEY,
} from '@/hooks/useDrafts';
import { eventsService } from '@/services/events.service';
import { draftsService } from '@/services/drafts.service';
import { useQueryClient } from '@tanstack/react-query';
import type { FinanceEvent } from '@/models';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EventCard } from '@/components/events/EventCard';
import { BulkActionsModal } from '@/components/events/BulkActionsModal';
import { EventsListView } from '@/components/events/EventsListView';
import { DraftsPageActions } from '@/components/events/DraftsPageActions';
import { fromDraftToCreateDto, fromDraftToPatchDto } from '@/components/events/EventFormMapper';

type DraftSegment = 'RECENT' | 'LINKED' | 'UNLINKED';

const LONG_PRESS_MS = 450;

const getDraftSelectionId = (draft: FinanceEvent) => draft.draftId ?? draft.id;

const isLinkedDraft = (draft: FinanceEvent) =>
  typeof draft.id === 'number' && draft.id > 0;

const draftTargetRoute = (draft: FinanceEvent) =>
  isLinkedDraft(draft) ? Routes.EVENT_EDIT(draft.id) : Routes.EVENT_NEW;


export function DraftsPage() {
  const { t } = useTranslation();
  const { navigate } = useAppNavigation();
  const queryClient = useQueryClient();

  const { data: draftEvents, isLoading, error } = useFinanceEventDrafts();
  const deleteAllDrafts = useDeleteAllDrafts();
  const deleteDraft = useDeleteDraft();

  const [segment, setSegment] = useState<DraftSegment>('RECENT');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<number>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const longPressTimer = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  const allDrafts = useMemo(() => draftEvents ?? [], [draftEvents]);

  const segmentCounts = useMemo(
    () => ({
      RECENT: allDrafts.length,
      LINKED: allDrafts.filter(isLinkedDraft).length,
      UNLINKED: allDrafts.filter((d) => !isLinkedDraft(d)).length,
    }),
    [allDrafts]
  );

  const segmentedDrafts = useMemo(() => {
    const normalized = debouncedSearch.trim().toLowerCase();
    return allDrafts
      .filter((draft) => {
        if (segment === 'LINKED') return isLinkedDraft(draft);
        if (segment === 'UNLINKED') return !isLinkedDraft(draft);
        return true;
      })
      .filter((draft) => {
        if (!normalized) return true;
        return (
          draft.name?.toLowerCase().includes(normalized) ||
          draft.description?.toLowerCase().includes(normalized)
        );
      });
  }, [allDrafts, segment, debouncedSearch]);

  const selectedDrafts = useMemo(
    () => allDrafts.filter((draft) => selectedDraftIds.has(getDraftSelectionId(draft))),
    [allDrafts, selectedDraftIds]
  );

  const toggleDraftSelection = useCallback((draft: FinanceEvent) => {
    const id = getDraftSelectionId(draft);
    setSelectedDraftIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const enterSelectionMode = useCallback(
    (draft?: FinanceEvent) => {
      setIsSelectionMode(true);
      if (draft) toggleDraftSelection(draft);
    },
    [toggleDraftSelection]
  );

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedDraftIds(new Set());
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const startLongPress = (draft: FinanceEvent) => {
    if (isSelectionMode) return;
    longPressFiredRef.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      enterSelectionMode(draft);
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const confirmDrafts = useCallback(
    async (draftsToConfirm: FinanceEvent[], mode: 'merge' | 'createOnly'): Promise<number[]> => {
      if (!draftsToConfirm.length || isConfirming) return [];
      setIsConfirming(true);
      const newIds: number[] = [];
      try {
        for (const draft of draftsToConfirm) {
          const persistedDraftId = draft.draftId;
          if (!persistedDraftId) continue;

          const originalEventId =
            mode === 'merge' && isLinkedDraft(draft) ? draft.id : undefined;

          if (originalEventId) {
            const updated = await eventsService.update(originalEventId, fromDraftToPatchDto(draft));
            newIds.push(updated.id);
          } else {
            const created = await eventsService.create(fromDraftToCreateDto(draft));
            newIds.push(created.id);
          }

          await draftsService.delete(persistedDraftId);
        }

        await queryClient.invalidateQueries({ queryKey: DRAFTS_KEY });
        exitSelectionMode();
        setIsConfirming(false);
        return newIds;
      } catch {
        setIsConfirming(false);
        return newIds;
      }
    },
    [isConfirming, queryClient, exitSelectionMode]
  );

  const handleConfirmAllMerge = async () => {
    const ids = await confirmDrafts(segmentedDrafts, 'merge');
    if (ids.length > 1) {
      navigate(`${Routes.EVENTS}?mergeIds=${ids.join(',')}`);
    } else {
      navigate(Routes.EVENTS);
    }
  };

  const handleConfirmAllCreate = async () => {
    const ids = await confirmDrafts(segmentedDrafts, 'createOnly');
    if (ids.length > 1) {
      // Just navigate to Events to view created items
      navigate(Routes.EVENTS);
    }
  };

  const handleConfirmSelectedMerge = async () => {
    const ids = await confirmDrafts(selectedDrafts, 'merge');
    if (ids.length > 1) {
      navigate(`${Routes.EVENTS}?mergeIds=${ids.join(',')}`);
    } else {
      navigate(Routes.EVENTS);
    }
  };

  const handleConfirmSelectedCreate = async () => {
    const ids = await confirmDrafts(selectedDrafts, 'createOnly');
    if (ids.length > 1) {
      navigate(Routes.EVENTS);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedDrafts.length || isDeletingSelected || deleteDraft.isPending) return;
    setIsDeletingSelected(true);
    try {
      for (const draft of selectedDrafts) {
        if (!draft.draftId) continue;
        await deleteDraft.mutateAsync(draft.draftId);
      }
      exitSelectionMode();
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleDeleteAll = async () => {
    await deleteAllDrafts.mutateAsync();
  };

  if (isLoading && !allDrafts.length) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const selectedCount = selectedDrafts.length;
  const hasDrafts = allDrafts.length > 0;
  const actionsBusy = isConfirming || isDeletingSelected || deleteDraft.isPending;

  const pills = [
    { label: t('drafts.segments.recent'), value: 'RECENT', badge: segmentCounts.RECENT },
    { label: t('drafts.segments.linked'), value: 'LINKED', badge: segmentCounts.LINKED },
    {
      label: t('drafts.segments.unlinked'),
      value: 'UNLINKED',
      badge: segmentCounts.UNLINKED,
    },
  ];

  const renderDraftItem = (draft: FinanceEvent) => {
    const selectionId = getDraftSelectionId(draft);
    const isSelected = selectedDraftIds.has(selectionId);
    const targetRoute = draftTargetRoute(draft);

    const handleClick = (event: React.MouseEvent) => {
      if (longPressFiredRef.current) {
        event.preventDefault();
        longPressFiredRef.current = false;
        return;
      }
      if (isSelectionMode) {
        event.preventDefault();
        toggleDraftSelection(draft);
      }
    };

    const rowClass = [
      'flex items-center gap-3 rounded-2xl pr-2 transition-colors',
      isSelectionMode ? 'cursor-pointer' : '',
      isSelected ? 'bg-dn-primary/5' : '',
    ].join(' ');

    const indicator = isSelectionMode && (
      <div
        className={[
          'shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors',
          isSelected ? 'border-dn-primary bg-dn-primary' : 'border-dn-text-muted',
        ].join(' ')}
      >
        {isSelected && <Icon name="check" className="text-xs text-white" />}
      </div>
    );

    const body = <EventCard event={draft} disableLink />;

    if (isSelectionMode) {
      return (
        <div onClick={handleClick} className={rowClass}>
          <div className="flex-1 min-w-0">{body}</div>
          {indicator}
        </div>
      );
    }

    return (
      <Link
        to={targetRoute}
        state={{ draft, from: Routes.EVENT_DRAFTS }}
        className={rowClass}
        onClick={handleClick}
        onPointerDown={() => startLongPress(draft)}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="flex-1 min-w-0">{body}</div>
      </Link>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title={t('drafts.title')}
        subtitle={t('events.eventsCount', { count: allDrafts.length })}
        action={
          <DraftsPageActions
            hasDrafts={hasDrafts}
            isSelectionMode={isSelectionMode}
            onSelect={() => enterSelectionMode()}
            onBulkActions={() => setShowBulkActions(true)}
            onCancelSelection={exitSelectionMode}
          />
        }
        back={Routes.EVENTS}
      />

      <EventsListView
        events={segmentedDrafts}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        filterPills={pills}
        activePill={segment}
        onPillChange={(value) => setSegment(value as DraftSegment)}
        renderItem={renderDraftItem}
        keyResolver={getDraftSelectionId}
        emptyTitle={t('drafts.noDraftsTitle')}
        emptyDescription={t('drafts.noDraftsDescription')}
      />

      {isSelectionMode && selectedCount > 0 && (
        <div className="fixed bottom-22 left-0 right-0 z-30 px-5">
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-dn-surface shadow-xl p-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-xs text-dn-text-muted px-1">
              {t('events.selectedCount', { count: selectedCount })}
            </span>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                size="sm"
                variant="danger"
                className="flex-1 sm:flex-none"
                onClick={handleDeleteSelected}
                disabled={actionsBusy}
                loading={isDeletingSelected || deleteDraft.isPending}
              >
                <Icon name="delete" className="text-sm" />
                {t('drafts.deleteSelected')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={handleConfirmSelectedCreate}
                disabled={actionsBusy}
                loading={isConfirming}
              >
                <Icon name="add_circle" className="text-sm" />
                {t('drafts.confirmSelectedCreate')}
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={handleConfirmSelectedMerge}
                disabled={actionsBusy}
                loading={isConfirming}
              >
                <Icon name="merge" className="text-sm" />
                {t('drafts.confirmSelectedMerge')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BulkActionsModal
        open={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        onConfirmAllMerge={handleConfirmAllMerge}
        onConfirmAllCreate={handleConfirmAllCreate}
        onDeleteAll={handleDeleteAll}
        isConfirming={isConfirming}
        isDeleting={deleteAllDrafts.isPending}
        draftCount={segmentedDrafts.length}
      />
    </div>
  );
}
