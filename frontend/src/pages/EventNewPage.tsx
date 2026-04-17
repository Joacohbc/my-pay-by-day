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
import { Icon } from '@/components/ui/Icon';

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
  const handleSubmit = async (dto: CreateEventDto | PatchEventDto) => {
    const created = await createEvent.saveAsync(dto as CreateEventDto);

    if (created) {
      if (currentDraftId) deleteDraft.mutate(currentDraftId);
      if (relatedToEventId) {
        await addRelations.mutateAsync({ id: relatedToEventId, relatedIds: [created.id] });
        navigate(Routes.EVENT_DETAIL(relatedToEventId), { replace: true });
      } else {
        navigate(Routes.EVENT_DETAIL(created.id), { replace: true });
      }
    } else {
      navigate(eventsRoute());
    }
  };

  const handleDeleteDraftAndExit = async () => {
    if (currentDraftId) {
      await deleteDraft.mutateAsync(currentDraftId);
    }
    setCurrentDraftId(undefined);
    navigate(eventsRoute());
  };


  return (
    <div className="space-y-4">
      <PageHeader
        title={t('events.newEventTitle')}
        back={relatedToEventId ? Routes.EVENT_DETAIL(relatedToEventId) : eventsRoute()}
        action={
          !!currentDraftId && (
            <div className="flex items-center gap-1">
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
