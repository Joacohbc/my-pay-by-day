import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

interface ChatErrorCardProps {
  error: Error;
  onRetry: () => void | Promise<void>;
}

const MAX_DETAIL_LENGTH = 300;

export function ChatErrorCard({ error, onRetry }: ChatErrorCardProps) {
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);

  const detail = error.message?.trim().slice(0, MAX_DETAIL_LENGTH);

  const retry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3 border border-dn-error/30 bg-dn-error/5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-dn-error">
        <Icon name="error" className="text-[14px]" />
        {t('chat.error.title')}
      </div>
      {detail && <p className="text-xs text-dn-text-muted break-words">{detail}</p>}
      <div>
        <Button size="sm" variant="secondary" onClick={retry} loading={isRetrying} disabled={isRetrying}>
          <Icon name="refresh" className="text-[14px]" />
          {t('chat.error.retry')}
        </Button>
      </div>
    </Card>
  );
}
