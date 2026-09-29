import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Routes } from '@/lib/routes';
import { Icon } from '@/components/ui/Icon';

interface UnconvertedEventsNoticeProps {
  count: number | undefined;
  currency: string;
  className?: string;
}

/** Says how many events a converted total left out because they have no rate into its currency. */
export function UnconvertedEventsNotice({ count, currency, className = '' }: UnconvertedEventsNoticeProps) {
  const { t } = useTranslation();
  if (!count) return null;

  return (
    <Link
      to={Routes.SETTINGS_CURRENCIES}
      className={`flex items-start gap-2 px-3 py-2 rounded-2xl bg-dn-warning/10 border border-dn-warning/20 text-xs text-dn-warning ${className}`}
    >
      <Icon name="warning" className="text-sm shrink-0" />
      <span>{t('currencies.unconvertedNotice', { count, currency })}</span>
    </Link>
  );
}
