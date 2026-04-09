import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { useCreateEvent } from '@/hooks/useEvents';
import { useCreateFinanceEventDraft, useUpdateFinanceEventDraft, useDeleteDraft } from '@/hooks/useDrafts';
import type { CreateEventDto, PatchEventDto, Template, FinanceEvent } from '@/models';

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

  const preset =
    template ? {
      type: template.eventType,
      categoryId: template.category?.id,
      tagIds: template.tags.map((t) => String(t.id)),
      lineNodeIds: [
        ...(template.originNodeId ? [template.originNodeId] : []),
        ...(template.destinationNodeId ? [template.destinationNodeId] : []),
      ],
    } : undefined;

  const handleSubmit = async (dto: CreateEventDto | PatchEventDto, formDraftId?: number) => {
    const created = await createEvent.saveAsync(dto as CreateEventDto);
    if (created) {
      const idToDelete = formDraftId || draft?.draftId;
      if (idToDelete) {
        await deleteDraft.mutateAsync(idToDelete);
      }
      navigate(`/events/${created.id}`, { replace: true });
    } else {
      navigate('/events', { replace: true });
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

  const handleDeleteDraft = async (formDraftId?: number) => {
    const idToDelete = formDraftId || draft?.draftId;
    if (idToDelete) {
      await deleteDraft.mutateAsync(idToDelete);
    }
    navigate(-1);
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('events.newEventTitle')} back />
      
      {draft && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-dn-text-muted bg-dn-surface/80 backdrop-blur-md border border-white/5 shadow-sm px-3 py-1 rounded-pill whitespace-nowrap">
            <Icon name="edit_document" className="text-[14px]" />
            {t('drafts.editingDraft')}
          </span>
        </div>
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
          currentValues={draft as unknown as FinanceEvent}
          preset={preset}
          isDraft={!!draft}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          onDeleteDraft={handleDeleteDraft}
          submitLabel={t('events.createEvent')}
          loading={createEvent.isPending || createDraft.isPending || updateDraft.isPending || deleteDraft.isPending}
        />
      </div>
    </div>
  );
}
