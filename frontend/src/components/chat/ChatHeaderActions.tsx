import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

export type ChatView = 'chat' | 'list' | 'tasks';

interface ChatHeaderActionsProps {
  view: ChatView;
  onOpenTasks: () => void;
  onNewChat: () => void;
  onClearMemory: () => void;
  isClearMemoryDisabled: boolean;
}

const LABELLED_BUTTON_CLASSES =
  'shrink-0 h-10 px-3.5 flex items-center gap-1.5 rounded-full text-sm font-medium bg-dn-surface-low text-dn-text-main hover:bg-dn-surface transition-colors';

export function ChatHeaderActions({
  view,
  onOpenTasks,
  onNewChat,
  onClearMemory,
  isClearMemoryDisabled,
}: ChatHeaderActionsProps) {
  const { t } = useTranslation();

  if (view === 'tasks') return null;

  return (
    <div className="flex gap-2">
      {view === 'list' && (
        <button onClick={onOpenTasks} className={LABELLED_BUTTON_CLASSES} title={t('agentTasks.title')}>
          <Icon name="pending_actions" className="text-[18px]" />
          <span>{t('agentTasks.title')}</span>
        </button>
      )}
      {view === 'chat' && (
        <>
          <button onClick={onNewChat} className={LABELLED_BUTTON_CLASSES} title={t('chat.newChat')}>
            <Icon name="add" className="text-[18px]" />
            <span>{t('chat.newChat')}</span>
          </button>
          <button
            onClick={onClearMemory}
            disabled={isClearMemoryDisabled}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-dn-surface-low text-dn-text-main hover:bg-dn-error hover:text-white transition-colors disabled:opacity-30"
            aria-label={t('chat.clearMemory')}
            title={t('chat.clearMemory')}
          >
            <Icon name="delete_sweep" className="text-[18px]" />
          </button>
        </>
      )}
    </div>
  );
}
