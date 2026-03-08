import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

const getSnapshot = () => navigator.onLine;

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot);
  const { t } = useTranslation();

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-dn-warning/20 text-dn-warning text-sm py-2 px-4">
      <Icon name="cloud_off" className="text-base" />
      <span>{t('offline.banner')}</span>
    </div>
  );
}
