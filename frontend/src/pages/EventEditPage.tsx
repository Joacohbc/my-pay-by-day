import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Routes } from '@/lib/routes';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { DraftBadge } from '@/components/ui/DraftBadge';
import { useEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useCreateFinanceEventDraft, useUpdateFinanceEventDraft, useDeleteDraft, useFinanceEventDraftByEntityId } from '@/hooks/useDrafts';
import type { CreateEventDto, PatchEventDto, FinanceEvent } from '@/models';

export function EventEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(Number(id));
  const { data: fetchedDraft, isLoading: isLoadingDraft } = useFinanceEventDraftByEntityId(Number(id));

  const updateEvent = useUpdateEvent();
  const createDraft = useCreateFinanceEventDraft();
  const updateDraft = useUpdateFinanceEventDraft();
  const deleteDraft = useDeleteDraft();

  const state = useLocation().state as { draft?: FinanceEvent } | null;
  const draft = state?.draft ?? fetchedDraft ?? undefined;

  if (isLoading || isLoadingDraft) return <FullPageSpinner />;
  if (!event) return null;

  const handleSubmit = async (dto: CreateEventDto | PatchEventDto, formDraftId?: number) => {
    const draftId = formDraftId ?? draft?.draftId;

    // Navigate immediately to optimistically update the UI
    navigate(Routes.EVENT_DETAIL(id!));

    try {
      // Update the event, it is async so the unmount would happen before the mutation completes
      await updateEvent.mutateAsync({ id: Number(id), dto: dto as PatchEventDto });
      if (draftId) deleteDraft.mutate(draftId);
    } catch {
      // useUpdateEvent.onError handles cache rollback and the error toast
    }
  };

  const handleSaveDraft = async (dto: Partial<FinanceEvent>) => {
    const existingDraftId = dto.draftId ?? draft?.draftId;
    if (existingDraftId) {
      await updateDraft.mutateAsync({ id: existingDraftId, dto });
      return existingDraftId;
    }
    const payload = { ...dto, id: Number(id) };
    const created = await createDraft.mutateAsync(payload);
    return created.id;
  };

  const handleDeleteDraft = async (formDraftId?: number, shouldExit = true) => {
    const draftId = formDraftId ?? draft?.draftId;
    if (draftId) {
      await deleteDraft.mutateAsync(draftId);
    }
    if (shouldExit) {
      navigate(Routes.EVENT_DETAIL(Number(id)));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('events.editEvent')} back />
      {draft && <DraftBadge saving={createDraft.isPending || updateDraft.isPending} />}
      <div className="px-5 pb-6">
        <EventForm
          mode="edit"
          baseValues={event}
          draftValues={draft}
          isDraft={!!draft}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          onDeleteDraft={handleDeleteDraft}
          submitLabel={t('events.updateEvent')}
          loading={updateEvent.isPending || deleteDraft.isPending}
        />
      </div>
    </div>
  );
}
