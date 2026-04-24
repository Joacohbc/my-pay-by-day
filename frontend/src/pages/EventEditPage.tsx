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
import type { CreateEventDto, PatchEventDto, FinanceEvent } from '@/models';
import { useDebounceCallback } from '@/hooks/useDebounce';
import { Icon } from '@/components/ui/Icon';

export function EventEditPage() {
  const { t } = useTranslation();
  const [resetVersion, setResetVersion] = useState(0);
  const { id } = useParams<{ id: string }>();
  const { navigateBack } = useAppNavigation();
  const { data: event, refetch: refetchEvent, isLoading } = useEvent(Number(id));
  const { data: fetchedDraft, isLoading: isLoadingDraft } = useFinanceEventDraftByEntityId(Number(id));

  const updateEvent = useUpdateEvent();
  const createDraft = useCreateFinanceEventDraft();
  const updateDraft = useUpdateFinanceEventDraft();
  const deleteDraft = useDeleteDraft();

  const draftInitial = useRef<{ data: typeof fetchedDraft | undefined; captured: boolean }>({ data: undefined, captured: false });
  const [draftToForm, setDraftToForm] = useState<typeof fetchedDraft | undefined>(undefined);

  useEffect(() => {
    if (!isLoadingDraft && !draftInitial.current.captured) {
      draftInitial.current = { data: fetchedDraft ?? undefined, captured: true };
      // eslint-disable-next-line
      setDraftToForm(fetchedDraft ?? undefined);
    }
  }, [isLoadingDraft, fetchedDraft]);

  const handleSaveDraft = useCallback(async (dto: Partial<FinanceEvent>) => {
    if (fetchedDraft?.draftId) {
      await updateDraft.mutateAsync({ id: fetchedDraft.draftId, dto });
      return;
    }
    const payload = { ...dto, id: Number(id) };
    await createDraft.mutateAsync(payload);
  }, [fetchedDraft, id, createDraft, updateDraft]);

  const debouncedSaveDraft = useDebounceCallback(handleSaveDraft, 500);

  const handleDeleteDraftAndExit = async () => {
    if (fetchedDraft?.draftId) {
      await deleteDraft.mutateAsync(fetchedDraft.draftId);
    }
    navigateBack(Routes.EVENT_DETAIL(Number(id)));
  };

  const handleResetDraft = async () => {
    if (fetchedDraft?.draftId) {
      await deleteDraft.mutateAsync(fetchedDraft.draftId);
      // Mark as captured with undefined to prevent re-capturing the stale draft from cache
      draftInitial.current = { data: undefined, captured: true };
      setResetVersion(v => v + 1);
      refetchEvent();
    }
  };

  if (isLoading || isLoadingDraft) return <FullPageSpinner />;
  if (!event) return null;

  const handleSubmit = async (dto: CreateEventDto | PatchEventDto) => {
    // Navigate immediately to optimistically update the UI
    navigateBack(Routes.EVENT_DETAIL(id!));

    // Update the event, it is async so the unmount would happen before the mutation completes
    await updateEvent.mutateAsync({ id: Number(id), dto: dto as PatchEventDto });
    if (fetchedDraft?.draftId) deleteDraft.mutate(fetchedDraft?.draftId);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('events.editEvent')}
        back={() => navigateBack(Routes.EVENT_DETAIL(id!))}
        action={
          !!fetchedDraft?.draftId && (
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
      
      {!!fetchedDraft?.draftId && (
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

