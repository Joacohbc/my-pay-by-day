import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEvent } from '@/hooks/useEvents';
import { useFinanceEventDrafts } from '@/hooks/useDrafts';
import { useTag } from '@/hooks/useTags';
import { useCategory } from '@/hooks/useCategories';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EventCard } from '@/components/events/EventCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Routes } from '@/lib/routes';
import type { ChatEntityRef } from '@/components/chat/chatEntityRefs';

type TranslateFn = ReturnType<typeof useTranslation>['t'];

function eventLabel(t: TranslateFn, action: ChatEntityRef['action']): string {
  if (action === 'created') return t('chat.entityCards.eventCreated');
  if (action === 'updated') return t('chat.entityCards.eventUpdated');
  return t('chat.entityCards.eventShown');
}

function draftLabel(t: TranslateFn, action: ChatEntityRef['action']): string {
  if (action === 'created') return t('chat.entityCards.draftCreated');
  if (action === 'updated') return t('chat.entityCards.draftUpdated');
  return t('chat.entityCards.draftShown');
}

function UnavailableCard({ message }: { message: string }) {
  return (
    <Card className="flex items-center gap-2 text-xs text-dn-text-muted mt-2 opacity-70">
      <Icon name="link_off" className="text-sm" />
      {message}
    </Card>
  );
}

function EntityCardLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-dn-text-muted mb-1 px-1">{children}</p>;
}

export function EventCardSkeleton() {
  return (
    <div className="flex items-center w-full justify-between py-1">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-14 shrink-0" />
    </div>
  );
}

function PillCardSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function InlineEventCard({ eventId, action }: { eventId: number; action: ChatEntityRef['action'] }) {
  const { t } = useTranslation();
  const { data: event, isError, isLoading } = useEvent(eventId);

  if (isError) return <UnavailableCard message={t('chat.entityCards.eventUnavailable')} />;

  return (
    <div className="mt-2">
      <EntityCardLabel>{eventLabel(t, action)}</EntityCardLabel>
      <Card>
        {isLoading || !event ? <EventCardSkeleton /> : <EventCard event={event} from={Routes.CHAT} />}
      </Card>
    </div>
  );
}

export function InlineDraftCard({ draftId, action }: { draftId: number; action: ChatEntityRef['action'] }) {
  const { t } = useTranslation();
  const { data: drafts, isLoading } = useFinanceEventDrafts();
  const draft = drafts?.find((d) => d.draftId === draftId);

  if (!isLoading && !draft) return <UnavailableCard message={t('chat.entityCards.draftUnavailable')} />;

  return (
    <div className="mt-2">
      <EntityCardLabel>{draftLabel(t, action)}</EntityCardLabel>
      <Card>
        {isLoading || !draft ? <EventCardSkeleton /> : <EventCard event={draft} from={Routes.CHAT} />}
      </Card>
    </div>
  );
}

export function InlineTagCard({ tagId }: { tagId: number }) {
  const { t } = useTranslation();
  const { data: tag, isError, isLoading } = useTag(tagId);

  if (isError) return <UnavailableCard message={t('chat.entityCards.tagUnavailable')} />;

  if (isLoading || !tag) {
    return (
      <div className="mt-2">
        <EntityCardLabel>{t('chat.entityCards.tagShown')}</EntityCardLabel>
        <Card>
          <PillCardSkeleton />
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <EntityCardLabel>{t('chat.entityCards.tagShown')}</EntityCardLabel>
      <Link to={Routes.TAG_DETAIL(tag.id)} state={{ from: Routes.CHAT }}>
        <Card className="flex items-center gap-4 hover:bg-dn-surface transition-colors">
          <div className="w-10 h-10 rounded-2xl bg-dn-primary/10 text-dn-primary flex items-center justify-center shrink-0">
            <span className="text-lg font-bold">#</span>
          </div>
          <p className="text-base font-medium text-dn-text-main truncate">{tag.name}</p>
        </Card>
      </Link>
    </div>
  );
}

export function InlineCategoryCard({ categoryId }: { categoryId: number }) {
  const { t } = useTranslation();
  const { data: category, isError, isLoading } = useCategory(categoryId);

  if (isError) return <UnavailableCard message={t('chat.entityCards.categoryUnavailable')} />;

  if (isLoading || !category) {
    return (
      <div className="mt-2">
        <EntityCardLabel>{t('chat.entityCards.categoryShown')}</EntityCardLabel>
        <Card>
          <PillCardSkeleton />
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <EntityCardLabel>{t('chat.entityCards.categoryShown')}</EntityCardLabel>
      <Link to={Routes.CATEGORY_DETAIL(category.id)} state={{ from: Routes.CHAT }}>
        <Card className="flex items-center gap-4 hover:bg-dn-surface transition-colors">
          <CategoryIcon category={category} size="lg" />
          <p className="text-base font-medium text-dn-text-main truncate">{category.name}</p>
        </Card>
      </Link>
    </div>
  );
}
