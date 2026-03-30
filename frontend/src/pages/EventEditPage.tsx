import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import { useEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useCreateFinanceEventDraft, useUpdateFinanceEventDraft, useDeleteDraft, useFinanceEventDrafts } from '@/hooks/useDrafts';
import type { CreateEventDto, FinanceEvent } from '@/models';

export function EventEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(Number(id));
  const { data: drafts, isLoading: isLoadingDrafts } = useFinanceEventDrafts();

  const updateEvent = useUpdateEvent();
  const createDraft = useCreateFinanceEventDraft();
  const updateDraft = useUpdateFinanceEventDraft();
  const deleteDraft = useDeleteDraft();

  const state = useLocation().state as { draft?: FinanceEvent } | null;
  const existingDraft = drafts?.find(d => d.id === Number(id));
  const draft = state?.draft || existingDraft;

  if (isLoading || isLoadingDrafts) return <FullPageSpinner />;
  if (!event) return null;

  const handleSubmit = async (dto: CreateEventDto, formDraftId?: number) => {
    await updateEvent.mutateAsync({ id: Number(id), dto });
    const idToDelete = formDraftId || draft?.draftId;
    if (idToDelete) {
      await deleteDraft.mutateAsync(idToDelete);
    }
    navigate(`/events/${id}`, { replace: true });
  };

  const handleSaveDraft = async (dto: Partial<FinanceEvent>) => {
    const targetDraftId = dto.draftId || draft?.draftId;
    if (targetDraftId) {
      await updateDraft.mutateAsync({ id: targetDraftId, dto });
      return targetDraftId;
    } else {
      // Create a draft linked to the current event
      const payload = { ...dto, id: Number(id) };
      const created = await createDraft.mutateAsync(payload);
      return created.id;
    }
  };

  const handleDeleteDraft = async (formDraftId?: number) => {
    const idToDelete = formDraftId || draft?.draftId;
    if (idToDelete) {
      await deleteDraft.mutateAsync(idToDelete);
    }
    navigate(-1);
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('events.editEvent')} back />
      {draft && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-dn-text-muted bg-dn-surface/80 backdrop-blur-md border border-white/5 shadow-sm px-3 py-1 rounded-pill whitespace-nowrap">
            <Icon name="edit_document" className="text-[14px]" />
            {t('drafts.editingDraft')}
          </span>
        </div>
      )}
      <div className="px-5 pb-6">
        <EventForm
          defaultValues={(draft || event) as unknown as FinanceEvent}
          isDraft={!!draft}
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
