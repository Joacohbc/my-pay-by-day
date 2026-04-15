import { type FocusEvent, type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface EventsPageActionsProps {
  hasBulkActions: boolean;
  onBulkActions: () => void;
  onMergeEvents: () => void;
  onNewEvent: () => void;
}

export function EventsPageActions({
  hasBulkActions,
  onBulkActions,
  onMergeEvents,
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

  return (
    <div className="relative" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {hasBulkActions && (
          <Button size="sm" variant="secondary" onClick={onBulkActions}>
            <Icon name="bolt" className="text-sm" />
            {t('drafts.bulkActions')}
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onMergeEvents}>
          <Icon name="merge" className="text-sm" />
          {t('events.merge')}
        </Button>
        <Button size="sm" onClick={onNewEvent}>
          <Icon name="add" className="text-sm" />
          {t('common.new')}
        </Button>
      </div>

      <div className="sm:hidden">
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
        </Button>

        {showMenu && (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-card border border-white/10 bg-dn-surface shadow-xl">
            {hasBulkActions && (
              <button
                type="button"
                onClick={() => handleActionClick(onBulkActions)}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
              >
                <Icon name="bolt" className="text-base text-dn-primary" />
                {t('drafts.bulkActions')}
              </button>
            )}
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
              onClick={() => handleActionClick(onNewEvent)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
            >
              <Icon name="add" className="text-base text-dn-primary" />
              {t('common.new')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}