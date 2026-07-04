import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Routes } from '@/lib/routes';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { DraftBadge } from '@/components/ui/DraftBadge';
import { useEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useUpsertFinanceEventDraftByEventId, useDeleteDraft, useFinanceEventDraftByEntityId } from '@/hooks/useDrafts';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import type { CreateEventDto, PatchEventDto, FinanceEventDraftInputDto } from '@/models';
import { useDebounceCallback } from '@/hooks/useDebounce';
import { Icon } from '@/components/ui/Icon';

export function EventEditPage() {
  const { t } = useTranslation();
  const [resetVersion, setResetVersion] = useState(0);
  const { id } = useParams<{ id: string }>();
  const { navigateBack } = useAppNavigation();
  const { data: event, refetch: refetchEvent, isLoading } = useEvent(Number(id));
  const { data: fetchedDraft, isLoading: isLoadingDraft, isFetching: isFetchingDraft } = useFinanceEventDraftByEntityId(Number(id));

  const updateEvent = useUpdateEvent();
  const upsertDraft = useUpsertFinanceEventDraftByEventId();
  const deleteDraft = useDeleteDraft();

  // Bundled into one state object (rather than separate useState calls) so the capture effect below fires a
  // single setState — the draft is only ever captured once from the server, then edited imperatively.
  const [draftState, setDraftState] = useState<{ toForm: typeof fetchedDraft | undefined; draftId: number | undefined; captured: boolean }>({
    toForm: undefined,
    draftId: undefined,
    captured: false,
  });
  const { toForm: draftToForm, draftId: currentDraftId, captured: isDraftCaptured } = draftState;

  useEffect(() => {
    const isDraftReadyToCapture = !isLoadingDraft && (!isFetchingDraft || fetchedDraft != null);
    if (!isDraftReadyToCapture || isDraftCaptured) return;
    // One-time capture from the draft query, guarded by isDraftCaptured above — deliberately NOT a live sync,
    // since re-syncing on every background refetch would blow away in-progress edits/AI patches in the form.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftState({ toForm: fetchedDraft ?? undefined, draftId: fetchedDraft?.draftId, captured: true });
  }, [isLoadingDraft, isFetchingDraft, fetchedDraft, isDraftCaptured]);

  const handleSaveDraft = useCallback(async (dto: FinanceEventDraftInputDto): Promise<number> => {
    const payload = { ...dto, id: Number(id) };
    const created = await upsertDraft.mutateAsync({ eventId: Number(id), dto: payload });
    setDraftState((prev) => ({ ...prev, draftId: created.id }));
    return created.id;
  }, [id, upsertDraft]);

  const handleDraftIdResolved = useCallback((draftId: number) => {
    setDraftState((prev) => ({ ...prev, draftId }));
  }, []);

  const debouncedSaveDraft = useDebounceCallback(handleSaveDraft, 500);

  const handleDeleteDraftAndExit = async () => {
    if (currentDraftId) {
      await deleteDraft.mutateAsync(currentDraftId);
    }
    navigateBack(Routes.EVENT_DETAIL(Number(id)));
  };

  const handleResetDraft = async () => {
    if (currentDraftId) {
      await deleteDraft.mutateAsync(currentDraftId);
      // Stays captured=true so the effect above never re-captures the now-deleted, stale draft from cache.
      setDraftState({ toForm: undefined, draftId: undefined, captured: true });
      setResetVersion(v => v + 1);
      refetchEvent();
    }
  };

  if (isLoading || isLoadingDraft || !isDraftCaptured) return <FullPageSpinner />;
  if (!event) return null;

  const handleSubmit = async (dto: CreateEventDto | PatchEventDto) => {
    // Navigate immediately to optimistically update the UI
    navigateBack(Routes.EVENT_DETAIL(id!));

    // Update the event, it is async so the unmount would happen before the mutation completes
    await updateEvent.mutateAsync({ id: Number(id), dto: dto as PatchEventDto });
    if (currentDraftId) deleteDraft.mutate(currentDraftId);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('events.editEvent')}
        back={() => navigateBack(Routes.EVENT_DETAIL(id!))}
        action={
          !!currentDraftId && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleResetDraft}
                className="w-10 h-10 flex items-center justify-center rounded-full text-dn-text-muted hover:bg-white/5 hover:text-dn-primary transition-colors"
                title={t('drafts.deleteAndReset')}
              >
                <Icon name="refresh" className="text-xl" />
              </button>
              <button
                onClick={handleDeleteDraftAndExit}
                className="w-10 h-10 flex items-center justify-center rounded-full text-dn-error hover:bg-dn-error/5 transition-colors"
                title={t('drafts.deleteAndExit')}
              >
                <Icon name="delete_forever" className="text-xl" />
              </button>
            </div>
          )
        }
      />
      
      {!!currentDraftId && (
        <DraftBadge saving={upsertDraft.isPending} />
      )}

      <div className="px-5 pb-6">
        <EventForm
          key={resetVersion}
          mode="edit"
          baseValues={event}
          draftValues={draftToForm ?? undefined}
          onSubmit={handleSubmit}
          onChange={debouncedSaveDraft}
          aiChatDraftId={currentDraftId}
          onEnsureDraft={handleSaveDraft}
          onDraftIdResolved={handleDraftIdResolved}
          submitLabel={t('events.updateEvent')}
          loading={updateEvent.isPending || deleteDraft.isPending}
        />
      </div>
    </div>
  );
}

