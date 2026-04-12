import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';

export const AiIcon = () => <Icon name="auto_awesome" />;

interface AiFieldActionsProps {
  onGenerate: () => void;
  onFixSpelling: () => void;
  isLoading: boolean;
}

export function AiFieldActions({ onGenerate, onFixSpelling, isLoading }: AiFieldActionsProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isLoading}
        className="flex items-center gap-1 text-xs text-dn-primary/70 hover:text-dn-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={t('ai.actions.title')}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <Icon name="auto_awesome" className="text-sm" />
        )}
        <span className="font-medium uppercase tracking-wider">{t('ai.actions.label')}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-40 rounded-xl bg-dn-surface border border-white/10 shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => handleAction(onGenerate)}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-dn-text-main hover:bg-dn-surface-low transition-colors"
          >
            <Icon name="draw" className="text-base text-dn-primary" />
            {t('ai.actions.generate')}
          </button>
          <button
            type="button"
            onClick={() => handleAction(onFixSpelling)}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-dn-text-main hover:bg-dn-surface-low transition-colors"
          >
            <Icon name="spellcheck" className="text-base text-dn-primary" />
            {t('ai.actions.fixSpelling')}
          </button>
        </div>
      )}
    </div>
  );
}
