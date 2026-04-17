import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';

interface DraftBadgeProps {
  saving?: boolean;
  onDelete?: () => void;
}

export function DraftBadge({ saving = false, onDelete }: DraftBadgeProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!showDelete) {
      const timer = setTimeout(() => setCollapsed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [showDelete]);

  const handleToggle = () => {
    if (collapsed) {
      setCollapsed(false);
      return;
    }
    setShowDelete(!showDelete);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div className="fixed bottom-20 right-3 z-50">
      <div
        onClick={handleToggle}
        className={[
          'inline-flex items-center text-[11px] font-medium text-dn-text-muted',
          'bg-dn-surface/80 backdrop-blur-md border border-white/5 shadow-sm',
          'rounded-pill whitespace-nowrap transition-all duration-500 ease-in-out',
          'cursor-pointer select-none',
          collapsed ? 'px-1.5 py-1.5 gap-0' : 'px-3 py-1 gap-1.5',
        ].join(' ')}
      >
        <span className="inline-flex items-center justify-center w-3.5 h-3.5">
          {saving ? (
            <Spinner size="sm" className="h-3.5! w-3.5!" />
          ) : (
            <Icon name="edit_document" className="text-[14px]" />
          )}
        </span>
        <div
          className={[
            'overflow-hidden transition-all duration-500 ease-in-out flex items-center',
            collapsed ? 'max-w-0 opacity-0' : 'max-w-64 opacity-100',
          ].join(' ')}
        >
          <span>{t('drafts.editingDraft')}</span>

          <div
            className={[
              'overflow-hidden transition-all duration-300 ease-in-out flex items-center',
              showDelete ? 'max-w-20 opacity-100 ml-2 pl-2 border-l border-white/10' : 'max-w-0 opacity-0',
            ].join(' ')}
          >
            <button
              onClick={handleDelete}
              className="text-dn-error hover:text-dn-error/80 transition-colors flex items-center gap-1"
            >
              <Icon name="delete" className="text-[14px]" />
              <span>{t('common.delete')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
