import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

export function ChatEmptyState() {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col items-center justify-center text-dn-text-main/50 space-y-4 py-20">
      <Icon name={'smart_toy'} className="text-4xl text-dn-primary/50" />
      <p className="text-sm text-center px-8">{t('chat.emptyState')}</p>
      <p className="text-xs text-center px-8 text-dn-text-main/30">
        {t('chat.imageHint')}
      </p>
    </div>
  );
}
