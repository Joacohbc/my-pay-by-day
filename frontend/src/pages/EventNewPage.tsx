import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCreateEvent } from '@/hooks/useEvents';
import { useCreateFinanceEventDraft, useDeleteDraft } from '@/hooks/useDrafts';
import type { CreateEventDto, Template, FinanceEvent } from '@/models';

export function EventNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const createEvent = useCreateEvent();
  const createDraft = useCreateFinanceEventDraft();
  const deleteDraft = useDeleteDraft();

  const state = location.state as { template?: Template, draft?: FinanceEvent } | null;
  console.log(state);
  
  const template = state?.template;
  const draft = state?.draft;

  const preset = template
    ? {
        type: template.eventType,
        categoryId: template.category?.id,
        tagIds: template.tags.map((t) => String(t.id)),
        lineNodeIds: [
          ...(template.originNodeId ? [template.originNodeId] : []),
          ...(template.destinationNodeId ? [template.destinationNodeId] : []),
        ],
      }
    : undefined;

  const handleSubmit = async (dto: CreateEventDto) => {
    const created = await createEvent.saveAsync(dto);
    if (created) {
      if (draft?.draftId) {
        await deleteDraft.mutateAsync(draft.draftId);
      }
      navigate(`/events/${created.id}`, { replace: true });
    } else {
      // Queued offline — go back to event list
      navigate('/events', { replace: true });
    }
  };

  const handleSaveDraft = async (dto: Partial<CreateEventDto>) => {
    await createDraft.mutateAsync(dto);
    navigate('/events', { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('events.newEventTitle')} back />
      {template && (
        <div className="px-5">
          <p className="text-xs text-dn-text-muted">
            {t('events.template')}:{' '}
            <span className="text-dn-primary font-medium">{template.name}</span>
          </p>
        </div>
      )}
      <div className="px-5 pb-6">
        <EventForm
          preset={preset}
          defaultValues={draft as unknown as FinanceEvent}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          submitLabel={t('events.createEvent')}
          loading={createEvent.isPending || createDraft.isPending || deleteDraft.isPending}
        />
      </div>
    </div>
  );
}
