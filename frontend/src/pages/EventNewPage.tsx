import { useNavigate } from 'react-router-dom';
import { EventForm } from '@/components/events/EventForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCreateEvent } from '@/hooks/useEvents';
import type { CreateEventDto } from '@/models';

export function EventNewPage() {
  const navigate = useNavigate();
  const createEvent = useCreateEvent();

  const handleSubmit = async (dto: CreateEventDto) => {
    const created = await createEvent.mutateAsync(dto);
    navigate(`/events/${created.id}`, { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="New Event" back />
      <div className="px-4 pb-6">
        <EventForm
          onSubmit={handleSubmit}
          submitLabel="Create Event"
          loading={createEvent.isPending}
        />
      </div>
    </div>
  );
}
