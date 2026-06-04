import { type FocusEvent, type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface DraftsPageActionsProps {
  hasDrafts: boolean;
  isSelectionMode: boolean;
  onSelect: () => void;
  onBulkActions: () => void;
  onCancelSelection: () => void;
}

export function DraftsPageActions({
  hasDrafts,
  isSelectionMode,
  onSelect,
  onBulkActions,
  onCancelSelection,
}: DraftsPageActionsProps) {
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

  const pendingDraftsBadge = hasDrafts && (
    <span className="w-2 h-2 rounded-full bg-dn-error inline-block shrink-0" />
  );

  if (isSelectionMode) {
    return (
      <Button size="sm" variant="secondary" onClick={onCancelSelection}>
        <Icon name="close" className="text-sm" />
        {t('common.cancel')}
      </Button>
    );
  }

  if (!hasDrafts) {
    return null;
  }

  return (
    <div className="relative" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {hasDrafts && (
          <>
            <Button size="sm" variant="secondary" onClick={onSelect}>
              <Icon name="check_box" className="text-sm" />
              {t('drafts.select')}
            </Button>
            <Button size="sm" onClick={onBulkActions}>
              <Icon name="bolt" className="text-sm" />
              {t('drafts.bulkActions')}
              {pendingDraftsBadge}
            </Button>
          </>
        )}
      </div>

      <div className="sm:hidden">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowMenu((previous) => !previous)}
          aria-expanded={showMenu}
          aria-haspopup="menu"
          aria-label={t('common.moreActions')}
        >
          <Icon name="more_horiz" className="text-sm" />
          {t('common.moreActions')}
          {pendingDraftsBadge}
        </Button>

        {showMenu && (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-card border border-white/10 bg-dn-surface shadow-xl">
            {hasDrafts && (
              <>
                <button
                  type="button"
                  onClick={() => handleActionClick(onSelect)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
                >
                  <Icon name="check_box" className="text-base text-dn-primary" />
                  {t('drafts.select')}
                </button>
                <button
                  type="button"
                  onClick={() => handleActionClick(onBulkActions)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-dn-text-main transition-colors hover:bg-dn-surface-low"
                >
                  <Icon name="bolt" className="text-base text-dn-primary" />
                  {t('drafts.bulkActions')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
