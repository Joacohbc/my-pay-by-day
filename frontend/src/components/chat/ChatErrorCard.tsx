import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

interface ChatErrorCardProps {
  onRetry: () => void;
  className?: string;
}

/** Shown when a generation failed, so a dead reply is a retry instead of a dead end. */
export function ChatErrorCard({ onRetry, className = '' }: ChatErrorCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={`flex flex-wrap items-center gap-3 border border-dn-error/30 bg-dn-error/5 ${className}`}>
      <Icon name="error" className="text-[18px] text-dn-error" />
      <p className="min-w-0 flex-1 text-sm text-dn-text-main">{t('chat.retry.failed')}</p>
      <Button size="sm" onClick={onRetry}>
        <Icon name="refresh" className="mr-1 text-[14px]" />
        {t('chat.retry.action')}
      </Button>
    </Card>
  );
}
