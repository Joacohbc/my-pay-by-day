import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

const MIN_EVENTS_TO_GROUP = 2;

interface EventGroupSelectionBarProps {
  readonly count: number;
  readonly isPending: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Floats just above the bottom nav while a long-press-started group selection is active. Sits at a
 * fixed offset rather than replacing the nav outright, so the page underneath keeps its normal
 * layout and the user can still see where they are in the app while picking events.
 */
export function EventGroupSelectionBar({ count, isPending, onConfirm, onCancel }: EventGroupSelectionBarProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-[92px] left-0 right-0 z-40 px-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="max-w-md mx-auto flex items-center gap-3 bg-dn-surface border border-white/10 rounded-2xl shadow-lg px-3 py-2.5">
        <button
          type="button"
          onClick={onCancel}
          title={t('common.cancel')}
          className="flex items-center justify-center rounded-full p-2 text-dn-text-muted hover:bg-dn-surface-low transition-colors shrink-0"
        >
          <Icon name="close" />
        </button>

        <span className="flex-1 text-sm text-dn-text-main">
          {t('events.group.selectedCount', { count })}
        </span>

        <Button size="sm" onClick={onConfirm} loading={isPending} disabled={count < MIN_EVENTS_TO_GROUP}>
          {t('events.group.createGroupAction')}
        </Button>
      </div>
    </div>
  );
}
