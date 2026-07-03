import { useCallback, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Routes } from '@/lib/routes';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { DraftBadge } from '@/components/ui/DraftBadge';
import { useEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useCreateFinanceEventDraft, useUpdateFinanceEventDraft, useDeleteDraft, useFinanceEventDraftByEntityId } from '@/hooks/useDrafts';
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
  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>();
  const currentDraftIdRef = useRef<number | undefined>(undefined);
  const creationPromiseRef = useRef<Promise<number> | null>(null);

  const updateEvent = useUpdateEvent();
  const createDraft = useCreateFinanceEventDraft();
  const updateDraft = useUpdateFinanceEventDraft();
  const deleteDraft = useDeleteDraft();

  const draftInitial = useRef<{ data: typeof fetchedDraft | undefined; captured: boolean }>({ data: undefined, captured: false });
  const [draftToForm, setDraftToForm] = useState<typeof fetchedDraft | undefined>(undefined);

  useEffect(() => {
    const isDraftReadyToCapture = !isLoadingDraft && (!isFetchingDraft || fetchedDraft != null);
    if (isDraftReadyToCapture && !draftInitial.current.captured) {
      draftInitial.current = { data: fetchedDraft ?? undefined, captured: true };
      setDraftToForm(fetchedDraft ?? undefined);
      if (fetchedDraft?.draftId) {
        currentDraftIdRef.current = fetchedDraft.draftId;
        setCurrentDraftId(fetchedDraft.draftId);
      }
    }
  }, [isLoadingDraft, isFetchingDraft, fetchedDraft]);

  const handleSaveDraft = useCallback(async (dto: FinanceEventDraftInputDto) => {
    let activeDraftId = currentDraftIdRef.current;
    
    if (!activeDraftId && creationPromiseRef.current) {
      activeDraftId = await creationPromiseRef.current;
    }

    if (activeDraftId) {
      await updateDraft.mutateAsync({ id: activeDraftId, dto });
      return;
    }

    const payload = { ...dto, id: Number(id) };
    const promise = createDraft.mutateAsync(payload).then(created => {
      currentDraftIdRef.current = created.id;
      setCurrentDraftId(created.id);
      return created.id;
    });

    creationPromiseRef.current = promise;
    try {
      await promise;
    } finally {
      creationPromiseRef.current = null;
    }
  }, [id, createDraft, updateDraft]);

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
      // Mark as captured with undefined to prevent re-capturing the stale draft from cache
      draftInitial.current = { data: undefined, captured: true };
      setCurrentDraftId(undefined);
      setResetVersion(v => v + 1);
      refetchEvent();
    }
  };

  if (isLoading || isLoadingDraft || !draftInitial.current.captured) return <FullPageSpinner />;
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
        <DraftBadge saving={createDraft.isPending || updateDraft.isPending} />
      )}

      <div className="px-5 pb-6">
        <EventForm
          key={resetVersion}
          mode="edit"
          baseValues={event}
          draftValues={draftToForm ?? undefined}
          onSubmit={handleSubmit}
          onChange={debouncedSaveDraft}
          submitLabel={t('events.updateEvent')}
          loading={updateEvent.isPending || deleteDraft.isPending}
        />
      </div>
    </div>
  );
}

