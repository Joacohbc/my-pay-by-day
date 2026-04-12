import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Routes } from '@/lib/routes';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { DraftBadge } from '@/components/ui/DraftBadge';
import { useCreateEvent } from '@/hooks/useEvents';
import { useCreateFinanceEventDraft, useUpdateFinanceEventDraft, useDeleteDraft } from '@/hooks/useDrafts';
import type { CreateEventDto, PatchEventDto, Template, FinanceEvent, FinanceLineItem } from '@/models';

function mapTemplateToEventValues(template: Template): Partial<FinanceEvent> {
  const originLineItem: FinanceLineItem | undefined = template.originNodeId
    ? { financeNodeId: template.originNodeId, financeNodeName: template.originNodeName ?? '', amount: 0 }
    : undefined;

  const destinationLineItem: FinanceLineItem | undefined = template.destinationNodeId
    ? { financeNodeId: template.destinationNodeId, financeNodeName: template.destinationNodeName ?? '', amount: 0 }
    : undefined;

  return {
    type: template.eventType,
    category: template.category,
    tags: template.tags,
    lineItems: [originLineItem, destinationLineItem].filter((li): li is FinanceLineItem => !!li),
  };
}

export function EventNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const createEvent = useCreateEvent();
  const createDraft = useCreateFinanceEventDraft();
  const updateDraft = useUpdateFinanceEventDraft();
  const deleteDraft = useDeleteDraft();

  const state = location.state as { template?: Template; draft?: FinanceEvent } | null;
  const template = state?.template;
  const draft = state?.draft;

  const initialValues = draft ?? (template ? mapTemplateToEventValues(template) : undefined);

  const handleSubmit = async (dto: CreateEventDto | PatchEventDto, formDraftId?: number) => {
    // saveAsync will throw if the API request fails, halting execution.
    // If it succeeds online, it returns the Event. If offline, it queues and returns null.
    const created = await createEvent.saveAsync(dto as CreateEventDto);
    
    if (created) {
      // Only delete the draft when the event is confirmed by the server.
      // If offline (created === null), the event is only queued locally — keep the draft.
      const idToDelete = formDraftId || draft?.draftId;
      if (idToDelete) deleteDraft.mutate(idToDelete);
      navigate(Routes.EVENT_DETAIL(created.id));
    } else {
      // Offline fallback navigation — draft is preserved intentionally
      navigate(Routes.EVENTS);
    }
  };

  const handleSaveDraft = async (dto: Partial<FinanceEvent>) => {
    const targetDraftId = dto.draftId || draft?.draftId;
    if (targetDraftId) {
      await updateDraft.mutateAsync({ id: targetDraftId, dto });
      return targetDraftId;
    } else {
      const created = await createDraft.mutateAsync(dto);
      return created.id;
    }
  };

  const handleDeleteDraft = async (formDraftId?: number, shouldExit = true) => {
    const idToDelete = formDraftId || draft?.draftId;
    if (idToDelete) {
      await deleteDraft.mutateAsync(idToDelete);
    }
    if (shouldExit) {
      navigate(-1);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('events.newEventTitle')} back />
      
      {draft && <DraftBadge saving={createDraft.isPending || updateDraft.isPending} />}

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
          mode="create"
          baseValues={initialValues}
          isDraft={!!draft}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          onDeleteDraft={handleDeleteDraft}
          submitLabel={t('events.createEvent')}
          loading={createEvent.isPending || deleteDraft.isPending}
        />
      </div>
    </div>
  );
}
