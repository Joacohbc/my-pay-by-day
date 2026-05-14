import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { usePaginationMode } from '@/hooks/usePaginationMode';

interface PaginationProps {
  page: number;         // zero-based
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({ page, totalPages, onPageChange, isLoading }: PaginationProps) {
  const { t } = useTranslation();
  const { mode, toggleMode } = usePaginationMode();
  const observerTarget = useRef<HTMLDivElement>(null);

  const hasMore = page < totalPages - 1;

  useEffect(() => {
    if (mode !== 'load-more' || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onPageChange(page + 1);
        }
      },
      { threshold: 0.1 }
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
  }, [mode, hasMore, isLoading, page, onPageChange]);

  if (totalPages <= 1 && mode === 'pagination') return null;

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      <div className="flex items-center justify-center gap-3">
        {mode === 'pagination' ? (
          <>
            <button
              id="pagination-prev"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              aria-label={t('common.prevPage')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-pill text-xs font-medium transition-all
                bg-dn-surface-low text-dn-text-muted
                hover:bg-dn-surface hover:text-dn-text-main
                disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icon name="chevron_left" className="text-base" />
              {t('common.prevPage')}
            </button>

            <span className="text-xs text-dn-text-muted tabular-nums select-none">
              {t('common.pageOf', { page: page + 1, total: totalPages })}
            </span>

            <button
              id="pagination-next"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore}
              aria-label={t('common.nextPage')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-pill text-xs font-medium transition-all
                bg-dn-surface-low text-dn-text-muted
                hover:bg-dn-surface hover:text-dn-text-main
                disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {t('common.nextPage')}
              <Icon name="chevron_right" className="text-base" />
            </button>
          </>
        ) : (
          <div ref={observerTarget} className="h-10 flex items-center justify-center">
            {isLoading && (
              <div className="flex items-center gap-2 text-dn-text-muted text-sm">
                <Icon name="sync" className="animate-spin" />
                <span>{t('common.loading')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={toggleMode}
        title={mode === 'pagination' ? t('common.viewModeLoadMore') : t('common.viewModePagination')}
        className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-dn-text-muted/50 hover:text-dn-text-main transition-colors px-2 py-1 rounded-md hover:bg-dn-surface"
      >
        <Icon name={mode === 'pagination' ? 'expand_more' : 'reorder'} className="text-xs" />
        <span>{mode === 'pagination' ? t('common.paginationMode') : t('common.loadMoreMode')}</span>
      </button>
    </div>
  );
}
