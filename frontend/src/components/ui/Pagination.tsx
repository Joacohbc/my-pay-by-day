import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

interface PaginationProps {
  page: number;         // zero-based
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({ page, totalPages, onPageChange, isLoading }: PaginationProps) {
  const { t } = useTranslation();
  const observerTarget = useRef<HTMLDivElement>(null);

  const hasMore = page < totalPages - 1;

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onPageChange(page + 1);
        }
      },
      { threshold: 0.30 }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasMore, isLoading, page, onPageChange]);

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      <div ref={observerTarget} className="h-10 flex items-center justify-center">
        {isLoading && (
          <div className="flex items-center gap-2 text-dn-text-muted text-sm">
            <Icon name="sync" className="animate-spin" />
            <span>{t('common.loading')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
