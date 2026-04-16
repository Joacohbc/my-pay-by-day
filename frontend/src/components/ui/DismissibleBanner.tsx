import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useBanner, type BannerId } from '@/store/dismissedBannersStore';

interface DismissibleBannerProps {
  bannerId: BannerId;
  children: ReactNode;
}

export function DismissibleBanner({ bannerId, children }: DismissibleBannerProps) {
  const { t } = useTranslation();
  const { isVisible, dismiss } = useBanner(bannerId);

  if (!isVisible) return null;

  return (
    <div className="flex items-start gap-3 bg-dn-primary/5 border border-dn-primary/20 rounded-card px-4 py-3">
      <Icon name="info" className="text-dn-primary shrink-0 mt-0.5 text-base" />
      <p className="text-xs text-dn-text-muted leading-relaxed flex-1">{children}</p>
      <button
        onClick={dismiss}
        aria-label={t('common.close')}
        className="shrink-0 text-dn-text-muted hover:text-dn-text-main transition-colors"
      >
        <Icon name="close" className="text-base" />
      </button>
    </div>
  );
}
