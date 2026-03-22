import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useCreateFinanceEventDraft, useUpdateFinanceEventDraft, useDeleteDraft } from '@/hooks/useDrafts';
import type { CreateEventDto, FinanceEvent } from '@/models';

export function EventEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(Number(id));
  const updateEvent = useUpdateEvent();
  const createDraft = useCreateFinanceEventDraft();
  const updateDraft = useUpdateFinanceEventDraft();
  const deleteDraft = useDeleteDraft();

  const state = useLocation().state as { draft?: FinanceEvent } | null;
  const draft = state?.draft;

  if (isLoading) return <FullPageSpinner />;
  if (!event) return null;

  const handleSubmit = async (dto: CreateEventDto) => {
    await updateEvent.mutateAsync({ id: Number(id), dto });
    if (draft?.draftId) {
      await deleteDraft.mutateAsync(draft.draftId);
    }
    navigate(`/events/${id}`, { replace: true });
  };

  const handleSaveDraft = async (dto: Partial<FinanceEvent>) => {
    if (dto.isDraft && dto.draftId) {
      await updateDraft.mutateAsync({ id: dto.draftId, dto });
      return dto.draftId;
    } else {
      // Create a draft linked to the current event
      const payload = { ...dto, id: Number(id) };
      const created = await createDraft.mutateAsync(payload);
      return created.id;
    }
  };

  const handleDeleteDraft = async () => {
    if (draft?.draftId) {
      await deleteDraft.mutateAsync(draft.draftId);
    }
    navigate('/events', { replace: true });
  };
  return (
    <div className="space-y-4">
      <PageHeader title={t('events.editEvent')} back />
      <div className="px-5 pb-6">
        <EventForm
          defaultValues={(draft || event) as unknown as FinanceEvent}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          onDeleteDraft={handleDeleteDraft}
          submitLabel={t('events.updateEvent')}
          loading={updateEvent.isPending || createDraft.isPending || updateDraft.isPending || deleteDraft.isPending}
        />
      </div>
    </div>
  );
}
