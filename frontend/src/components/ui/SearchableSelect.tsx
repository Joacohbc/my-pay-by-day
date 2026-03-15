import { useState, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  onBlur?: () => void;
  name?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const SearchableSelect = forwardRef<HTMLDivElement, SearchableSelectProps>(
  ({ label, error, options, placeholder, value, onChange, onBlur, name, className = '', id, disabled }, ref) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    const selectedOption = options.find((opt) => String(opt.value) === String(value));

    // Lock body scroll when open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
      if (!isOpen) return;
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
          setSearch('');
          if (onBlur) onBlur();
        }
      };
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onBlur]);

    const filteredOptions = options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (val: string | number) => {
      if (onChange) {
        onChange(val);
      }
      setIsOpen(false);
      setSearch('');
      if (onBlur) onBlur();
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative" ref={ref}>
          {/* Main Select Button */}
          <button
            type="button"
            id={inputId}
            name={name}
            disabled={disabled}
            className={[
              'w-full bg-dn-surface-low rounded-input px-4 py-3 text-sm text-dn-text-main text-left flex items-center justify-between',
              'focus:outline-none focus:ring-2 focus:ring-dn-primary/30',
              'transition-colors cursor-pointer border border-transparent',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
              error ? 'ring-2 ring-dn-error/50' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => !disabled && setIsOpen(true)}
          >
            <span className={selectedOption ? '' : 'text-dn-text-muted/70'}>
              {selectedOption ? selectedOption.label : (placeholder || t('common.select'))}
            </span>
            <Icon 
              name="expand_more" 
              className={`text-base text-dn-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Bottom Sheet Modal */}
          {isOpen && createPortal(
            <div className="fixed inset-0 z-100 flex flex-col justify-end">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  setSearch('');
                  if (onBlur) onBlur();
                }}
              />
              
              {/* Panel */}
              <div 
                className="relative w-full sm:max-w-md sm:mx-auto bg-dn-surface sm:border border-t border-white/5 sm:rounded-t-card rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[70vh] animate-in slide-in-from-bottom"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with Search */}
                <div className="p-4 border-b border-white/5 bg-dn-surface sticky top-0 sm:rounded-t-card rounded-t-3xl flex gap-3 items-center">
                  <div className="relative flex-1">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-lg" />
                    <input
                      type="text"
                      className="w-full bg-dn-surface-low text-base text-dn-text-main rounded-input pl-10 pr-4 py-3 outline-none focus:ring-1 focus:ring-dn-primary"
                      placeholder={t('common.search', 'Search...')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      setSearch('');
                      if (onBlur) onBlur();
                    }}
                    className="w-10 h-10 flex items-center justify-center shrink-0 text-dn-text-muted hover:text-dn-text-main bg-dn-surface-low rounded-full transition-colors"
                  >
                    <Icon name="close" className="text-[20px]" />
                  </button>
                </div>
                
                {/* Options List */}
                <div className="overflow-y-auto overflow-x-hidden p-2 flex-1 pb-safe max-h-[60vh] sm:max-h-[50vh]">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={[
                          'w-full text-left px-4 py-3.5 sm:py-3 text-base sm:text-sm rounded-input cursor-pointer transition-colors flex items-center justify-between mb-1',
                          String(opt.value) === String(value) 
                            ? 'bg-dn-primary/20 text-dn-primary font-medium' 
                            : 'text-dn-text-main hover:bg-white/5'
                        ].join(' ')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(opt.value);
                        }}
                      >
                        <span>{opt.label}</span>
                        {String(opt.value) === String(value) && (
                          <Icon name="check" className="text-base" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-12 text-center text-sm text-dn-text-muted">
                      {t('common.noResults', 'No results found')}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
        {error && <p className="text-xs text-dn-error">{error}</p>}
      </div>
    );
  }
);

SearchableSelect.displayName = 'SearchableSelect';
