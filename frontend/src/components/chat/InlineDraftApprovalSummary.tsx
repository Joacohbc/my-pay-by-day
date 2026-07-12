import { useEvent } from '@/hooks/useEvents';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { EventCard } from '@/components/events/EventCard';
import { EventCardSkeleton } from '@/components/chat/InlineEntityCard';

interface InlineDraftApprovalSummaryProps {
  readonly draftId?: number;
  readonly eventId?: number;
}

export function InlineDraftApprovalSummary({ draftId, eventId }: InlineDraftApprovalSummaryProps) {
  const { data: drafts, isLoading: isLoadingDrafts } = useFinanceEventDrafts();
  const { data: event, isLoading: isLoadingEvent } = useEvent(eventId ?? 0);

  if (draftId != null) {
    const draft = drafts?.find((d) => d.draftId === draftId);
    if (isLoadingDrafts || !draft) return <EventCardSkeleton />;
    return <EventCard event={draft} disableLink />;
  }

  if (eventId != null) {
    if (isLoadingEvent || !event) return <EventCardSkeleton />;
    return <EventCard event={event} disableLink />;
  }

  return null;
}
