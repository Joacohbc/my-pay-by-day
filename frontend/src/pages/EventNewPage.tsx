import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Routes, eventsRoute } from '@/lib/routes';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { DraftBadge } from '@/components/ui/DraftBadge';
import { useCreateEvent, useAddEventRelations } from '@/hooks/useEvents';
import { useCreateFinanceEventDraft, useUpdateFinanceEventDraft, useDeleteDraft } from '@/hooks/useDrafts';
import type { CreateEventDto, PatchEventDto, Template, FinanceEvent, FinanceLineItem } from '@/models';
import { useDebounceCallback } from '@/hooks/useDebounce';

function mapTemplateToEventValues(template: Template): Partial<FinanceEvent> {
  const originLineItem: FinanceLineItem = template.originNodeId
    ? { financeNodeId: template.originNodeId, financeNodeName: template.originNodeName ?? '', amount: 0 }
    : { financeNodeId: 0, financeNodeName: '', amount: 0 };

  const destinationLineItem: FinanceLineItem = template.destinationNodeId
    ? { financeNodeId: template.destinationNodeId, financeNodeName: template.destinationNodeName ?? '', amount: 0 }
    : { financeNodeId: 0, financeNodeName: '', amount: 0 };

  return {
    type: template.eventType,
    category: template.category,
    tags: template.tags,
    lineItems: [originLineItem, destinationLineItem],
  };
}

export function EventNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const createEvent = useCreateEvent();
  const addRelations = useAddEventRelations();
  const createDraft = useCreateFinanceEventDraft();
  const updateDraft = useUpdateFinanceEventDraft();
  const deleteDraft = useDeleteDraft();

  const state = location.state as { template?: Template; draft?: FinanceEvent; relatedToEventId?: number } | null;
  const template = state?.template;
  const draft = state?.draft;
  const relatedToEventId = state?.relatedToEventId;

  const templateValues = template ? mapTemplateToEventValues(template) : undefined;

  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>(draft?.draftId);

  const handleSaveDraft = useCallback(async (dto: Partial<FinanceEvent>) => {
    if (currentDraftId) {
      await updateDraft.mutateAsync({ id: currentDraftId, dto });
    } else {
      const created = await createDraft.mutateAsync(dto);
      setCurrentDraftId(created.id);
    }
  }, [currentDraftId, createDraft, updateDraft])

  const debouncedSaveDraft = useDebounceCallback(handleSaveDraft, 500)
  const handleSubmit = async (dto: CreateEventDto | PatchEventDto, formDraftId?: number) => {
    // saveAsync will throw if the API request fails, halting execution.
    // If it succeeds online, it returns the Event. If offline, it queues and returns null.
    const created = await createEvent.saveAsync(dto as CreateEventDto);

    if (created) {
      // Only delete the draft when the event is confirmed by the server.
      // If offline (created === null), the event is only queued locally — keep the draft.
      const idToDelete = formDraftId || currentDraftId;
      if (idToDelete) deleteDraft.mutate(idToDelete);
      if (relatedToEventId) {
        await addRelations.mutateAsync({ id: relatedToEventId, relatedIds: [created.id] });
        navigate(Routes.EVENT_DETAIL(relatedToEventId), { replace: true });
      } else {
        navigate(Routes.EVENT_DETAIL(created.id), { replace: true });
      }
    } else {
      // Offline fallback navigation — draft is preserved intentionally
      navigate(eventsRoute());
    }
  };

  const handleDeleteDraft = async (formDraftId?: number, shouldExit = true) => {
    const idToDelete = formDraftId || currentDraftId;
    if (idToDelete) {
      await deleteDraft.mutateAsync(idToDelete);
    }
    setCurrentDraftId(undefined);
    if (shouldExit) {
      navigate(eventsRoute());
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('events.newEventTitle')} back={relatedToEventId ? Routes.EVENT_DETAIL(relatedToEventId) : eventsRoute()} />
      
      {!!currentDraftId && (
        <DraftBadge
          saving={createDraft.isPending || updateDraft.isPending}
          onDelete={() => handleDeleteDraft()}
        />
      )}

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
          baseValues={templateValues}
          draftValues={draft}
          onSubmit={handleSubmit}
          onChange={debouncedSaveDraft}
          submitLabel={t('events.createEvent')}
          loading={createEvent.isPending || deleteDraft.isPending}
        />
      </div>
    </div>
  );
}
