import { type FocusEvent, type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface EventsPageActionsProps {
  draftsCount: number;
  duplicatesCount: number;
  onViewDrafts: () => void;
  onMergeEvents: () => void;
  onBulkUpdate: () => void;
  onViewDuplicates: () => void;
  onNewEvent: () => void;
}

export function EventsPageActions({
  draftsCount,
  duplicatesCount,
  onViewDrafts,
  onMergeEvents,
  onBulkUpdate,
  onViewDuplicates,
  onNewEvent,
}: EventsPageActionsProps) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

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

  const badge = (count: number) => (
    <span className="bg-dn-error text-white text-[10px] leading-tight font-semibold px-1.5 py-0.5 rounded-full min-w-4.5 text-center inline-block">
      {count}
    </span>
  );

  const responsiveBadge = (count: number) => (
    <>
      <span className="hidden sm:inline-block bg-dn-error text-white text-[10px] leading-tight font-semibold px-1.5 py-0.5 rounded-full min-w-4.5 text-center">
        {count}
      </span>
      <span className="inline-block sm:hidden w-2 h-2 rounded-full bg-dn-error shrink-0" />
    </>
  );

  const totalBadgeCount = draftsCount + duplicatesCount;

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
          className="px-2.5 sm:px-4"
        >
          <Icon name="menu" className="text-sm" />
          <span className="hidden sm:inline">{t('common.moreActions')}</span>
          {totalBadgeCount > 0 && responsiveBadge(totalBadgeCount)}
        </Button>
        <Button size="sm" onClick={onNewEvent} className="px-2.5 sm:px-4">
          <Icon name="add" className="text-sm" />
          <span className="hidden sm:inline">{t('common.new')}</span>
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
            {draftsCount > 0 && badge(draftsCount)}
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
            onClick={() => handleActionClick(onBulkUpdate)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
          >
            <Icon name="drive_file_rename_outline" className="text-base text-dn-primary" />
            {t('events.bulkUpdate')}
          </button>
          <button
            type="button"
            onClick={() => handleActionClick(onViewDuplicates)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
          >
            <Icon name="find_replace" className="text-base text-dn-primary" />
            <span className="flex-1 text-left">{t('duplicates.list.viewAll')}</span>
            {duplicatesCount > 0 && badge(duplicatesCount)}
          </button>
        </div>
      )}
    </div>
  );
}
