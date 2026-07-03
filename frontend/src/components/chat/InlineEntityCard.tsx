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
import { Routes } from '@/lib/routes';
import type { ChatEntityRef } from '@/components/chat/chatEntityRefs';

const EVENT_LABEL_KEY: Record<ChatEntityRef['action'], string> = {
  created: 'chat.entityCards.eventCreated',
  updated: 'chat.entityCards.eventUpdated',
  shown: 'chat.entityCards.eventShown',
};

const DRAFT_LABEL_KEY: Record<ChatEntityRef['action'], string> = {
  created: 'chat.entityCards.draftCreated',
  updated: 'chat.entityCards.draftUpdated',
  shown: 'chat.entityCards.draftShown',
};

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

export function InlineEventCard({ eventId, action }: { eventId: number; action: ChatEntityRef['action'] }) {
  const { t } = useTranslation();
  const { data: event, isError, isLoading } = useEvent(eventId);

  if (isLoading) return null;
  if (isError || !event) return <UnavailableCard message={t('chat.entityCards.eventUnavailable')} />;

  return (
    <div className="mt-2">
      <EntityCardLabel>{t(EVENT_LABEL_KEY[action])}</EntityCardLabel>
      <Card>
        <EventCard event={event} from={Routes.CHAT} />
      </Card>
    </div>
  );
}

export function InlineDraftCard({ draftId, action }: { draftId: number; action: ChatEntityRef['action'] }) {
  const { t } = useTranslation();
  const { data: drafts, isLoading } = useFinanceEventDrafts();
  const draft = drafts?.find((d) => d.draftId === draftId);

  if (isLoading) return null;
  if (!draft) return <UnavailableCard message={t('chat.entityCards.draftUnavailable')} />;

  return (
    <div className="mt-2">
      <EntityCardLabel>{t(DRAFT_LABEL_KEY[action])}</EntityCardLabel>
      <Card>
        <EventCard event={draft} from={Routes.CHAT} />
      </Card>
    </div>
  );
}

export function InlineTagCard({ tagId }: { tagId: number }) {
  const { t } = useTranslation();
  const { data: tag, isError, isLoading } = useTag(tagId);

  if (isLoading) return null;
  if (isError || !tag) return <UnavailableCard message={t('chat.entityCards.tagUnavailable')} />;

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

  if (isLoading) return null;
  if (isError || !category) return <UnavailableCard message={t('chat.entityCards.categoryUnavailable')} />;

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
