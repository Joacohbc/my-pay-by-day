import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCreateEvent } from '@/hooks/useEvents';
import type { CreateEventDto, Template } from '@/models';

export function EventNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const createEvent = useCreateEvent();

  const template = (location.state as { template?: Template } | null)?.template;

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
    const created = await createEvent.mutateAsync(dto);
    navigate(`/events/${created.id}`, { replace: true });
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
          onSubmit={handleSubmit}
          submitLabel={t('events.createEvent')}
          loading={createEvent.isPending}
        />
      </div>
    </div>
  );
}
