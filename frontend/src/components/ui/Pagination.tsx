import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

interface PaginationProps {
  page: number;         // zero-based
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-3">
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
        disabled={page >= totalPages - 1}
        aria-label={t('common.nextPage')}
        className="flex items-center gap-1 px-3 py-1.5 rounded-pill text-xs font-medium transition-all
          bg-dn-surface-low text-dn-text-muted
          hover:bg-dn-surface hover:text-dn-text-main
          disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        {t('common.nextPage')}
        <Icon name="chevron_right" className="text-base" />
      </button>
    </div>
  );
}
