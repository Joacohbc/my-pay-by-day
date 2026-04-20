import { type FocusEvent, type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface EventsPageActionsProps {
  draftsCount: number;
  onViewDrafts: () => void;
  onMergeEvents: () => void;
  onViewDuplicates: () => void;
  onNewEvent: () => void;
}

export function EventsPageActions({
  draftsCount,
  onViewDrafts,
  onMergeEvents,
  onViewDuplicates,
  onNewEvent,
}: EventsPageActionsProps) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const hasDrafts = draftsCount > 0;

  const handleActionClick = (action: () => void) => {
    setShowMenu(false);
    action();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget;

    if (!(nextFocusedElement instanceof Node) || !event.currentTarget.contains(nextFocusedElement)) {
      setShowMenu(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setShowMenu(false);
    }
  };

  const draftsBadge = hasDrafts && (
    <span className="bg-dn-error text-white text-[10px] leading-tight font-semibold px-1.5 py-0.5 rounded-full min-w-4.5 text-center inline-block">
      {draftsCount}
    </span>
  );

  return (
    <div className="relative" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowMenu((previousValue) => !previousValue)}
          aria-expanded={showMenu}
          aria-haspopup="menu"
          aria-label={t('common.moreActions')}
        >
          <Icon name="more_horiz" className="text-sm" />
          {t('common.moreActions')}
          {draftsBadge}
        </Button>
        <Button size="sm" onClick={onNewEvent}>
          <Icon name="add" className="text-sm" />
          {t('common.new')}
        </Button>
      </div>

      {showMenu && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-card border border-white/10 bg-dn-surface shadow-xl">
          <button
            type="button"
            onClick={() => handleActionClick(onViewDrafts)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
          >
            <Icon name="edit_note" className="text-base text-dn-primary" />
            <span className="flex-1 text-left">{t('drafts.viewDrafts')}</span>
            {draftsBadge}
          </button>
          <button
            type="button"
            onClick={() => handleActionClick(onMergeEvents)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
          >
            <Icon name="merge" className="text-base text-dn-primary" />
            {t('events.merge')}
          </button>
          <button
            type="button"
            onClick={() => handleActionClick(onViewDuplicates)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
          >
            <Icon name="find_replace" className="text-base text-dn-primary" />
            {t('duplicates.list.viewAll')}
          </button>
          <button
            type="button"
            onClick={() => handleActionClick(onNewEvent)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
          >
            <Icon name="add" className="text-base text-dn-primary" />
            {t('common.new')}
          </button>
        </div>
      )}
    </div>
  );
}
