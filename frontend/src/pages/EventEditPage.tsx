import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useEvent, useUpdateEvent } from '@/hooks/useEvents';
import type { CreateEventDto } from '@/models';

export function EventEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(Number(id));
  const updateEvent = useUpdateEvent();

  if (isLoading) return <FullPageSpinner />;
  if (!event) return null;

  const handleSubmit = async (dto: CreateEventDto) => {
    await updateEvent.mutateAsync({ id: Number(id), dto });
    navigate(`/events/${id}`, { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('events.editEvent')} back />
      <div className="px-5 pb-6">
        <EventForm
          defaultValues={event}
          onSubmit={handleSubmit}
          submitLabel={t('events.updateEvent')}
          loading={updateEvent.isPending}
        />
      </div>
    </div>
  );
}
