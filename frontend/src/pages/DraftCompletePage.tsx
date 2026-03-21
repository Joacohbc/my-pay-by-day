import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCreateEvent } from '@/hooks/useEvents';
import { useDraft, useUpdateFinanceEventDraft, useDeleteDraft } from '@/hooks/useDrafts';
import type { CreateEventDto, FinanceEvent } from '@/models';
import { Icon } from '@/components/ui/Icon';

export function DraftCompletePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const draftId = Number(id);
  const { data: draft, isLoading } = useDraft(draftId);
  const createEvent = useCreateEvent();
  const updateDraft = useUpdateFinanceEventDraft();
  const deleteDraft = useDeleteDraft();

  const handleSubmit = async (dto: CreateEventDto) => {
    // 1. Submit the final event
    const created = await createEvent.mutateAsync(dto);
    if (created) {
      // 2. Delete the draft successfully converted
      await deleteDraft.mutateAsync(draftId);
      navigate(`/events/${created.id}`, { replace: true });
    }
  };

  const handleSaveDraft = async (dto: Partial<CreateEventDto>) => {
    // Save over the same draft
    await updateDraft.mutateAsync({ id: draftId, dto });
    navigate('/drafts', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Icon name="progress_activity" className="animate-spin text-3xl text-dn-primary" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="space-y-4">
        <PageHeader title={t('drafts.completeTitle', { defaultValue: 'Completar Borrador' })} back />
        <div className="px-5 text-center py-10 text-dn-text-muted">
          {t('drafts.notFound', { defaultValue: 'Borrador no encontrado' })}
        </div>
      </div>
    );
  }

  // Pre-fill default values from the draft payload
  const defaultValues = draft.payload as unknown as Partial<FinanceEvent>;

  return (
    <div className="space-y-4">
      <PageHeader title={t('drafts.completeTitle', { defaultValue: 'Completar Borrador' })} back />
      
      <div className="px-5 pb-6">
        <EventForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          submitLabel={t('events.createEvent')}
          loading={createEvent.isPending || updateDraft.isPending || deleteDraft.isPending}
        />
      </div>
    </div>
  );
}
