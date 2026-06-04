import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeText } from '@/lib/utils/textUtils';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import iconsData from '@/assets/icons-outlined.json';
import { Icon } from '@/components/ui/Icon';

// ─── Constants ────────────────────────────────────────────────────────────────

// JSON keys starting with _<digit> represent icons whose Material Symbol name
// starts with that digit (e.g. "_10k" → "10k"). All other keys are used as-is.
function keyToIconName(key: string): string {
  return /^_\d/.test(key) ? key.slice(1) : key;
}

const ALL_ICONS: string[] = Object.keys(iconsData as Record<string, number>).map(keyToIconName);
const MAX_UNFILTERED = 200;
const CHUNK_SIZE = 100;

// ─── Full-screen modal ────────────────────────────────────────────────────────

interface BrowseModalProps {
  currentValue?: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}

function BrowseModal({ currentValue, onSelect, onClose }: BrowseModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(CHUNK_SIZE);
  };

  const filteredIcons = useMemo(() => {
    const q = normalizeText(search.trim());
    return q ? ALL_ICONS.filter((name) => normalizeText(name).includes(q)) : ALL_ICONS;
  }, [search]);

  // Lazy-load more icons when the sentinel enters the viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, filteredIcons.length));
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredIcons.length]);

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const visibleIcons = filteredIcons.slice(0, visibleCount);
  const hasMore = visibleCount < filteredIcons.length;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-dn-bg"
      role="dialog"
      aria-modal="true"
      aria-label={t('iconPicker.allIconsTitle')}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-dn-text-muted hover:text-dn-text-main transition-colors"
          aria-label={t('common.close')}
        >
          <Icon name="arrow_back" className="text-xl" />
        </button>
        <h2 className="text-sm font-semibold text-dn-text-main flex-1">
          {t('iconPicker.allIconsTitle')}
        </h2>
        <span className="text-xs text-dn-text-muted">{filteredIcons.length}</span>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 shrink-0">
        <Icon name="search" className="text-base text-dn-text-muted shrink-0" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t('iconPicker.searchPlaceholder')}
          className="flex-1 bg-transparent text-sm text-dn-text-main placeholder-dn-text-muted/50 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="text-dn-text-muted hover:text-dn-text-main transition-colors"
          >
            <Icon name="close" className="text-base" />
          </button>
        )}
      </div>

      {/* Icon grid — scrollable */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredIcons.length === 0 ? (
          <p className="text-xs text-dn-text-muted text-center py-10">
            {t('iconPicker.noResults')}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
              {visibleIcons.map((name) => {
                const isSelected = currentValue === name;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => onSelect(name)}
                    className={[
                      'flex items-center justify-center w-full aspect-square rounded-lg transition-all active:scale-90',
                      isSelected
                        ? 'bg-dn-primary text-dn-bg'
                        : 'text-dn-text-muted hover:bg-dn-surface hover:text-dn-text-main',
                    ].join(' ')}
                  >
                    <Icon name={name} className="text-xl" />
                  </button>
                );
              })}
            </div>
            {/* Sentinel for infinite scroll */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                <Icon name="pending" className="text-2xl text-dn-text-muted animate-pulse" />
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface IconPickerProps {
  value?: string;
  onChange?: (icon: string) => void;
  label?: string;
  error?: string;
}

export function IconPicker({ value, onChange, label, error }: IconPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const { icons, isLimited } = useMemo(() => {
    const q = normalizeText(search.trim());
    if (!q) {
      return { icons: ALL_ICONS.slice(0, MAX_UNFILTERED), isLimited: ALL_ICONS.length > MAX_UNFILTERED };
    }
    const matches = ALL_ICONS.filter((name) => normalizeText(name).includes(q));
    return { icons: matches, isLimited: false };
  }, [search]);

  const handleSelect = (name: string) => {
    onChange?.(value === name ? '' : name);
  };

  const handleModalSelect = (name: string) => {
    onChange?.(value === name ? '' : name);
    setModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
            {label}
          </label>
        )}

        <div
          className={[
            'rounded-input bg-dn-surface-low overflow-hidden',
            error ? 'ring-2 ring-dn-error/50' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
            <Icon name="search" className="text-base text-dn-text-muted shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('iconPicker.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-dn-text-main placeholder-dn-text-muted/50 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-dn-text-muted hover:text-dn-text-main transition-colors"
              >
                <Icon name="close" className="text-base" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-dn-text-muted hover:text-dn-text-main transition-colors shrink-0"
              title={t('iconPicker.browseAll')}
            >
              <Icon name="open_in_full" className="text-base" />
            </button>
          </div>

          {/* Selected icon preview */}
          {value && (
            <div className="flex items-center gap-2 mx-3 mt-2 px-3 py-1.5 rounded-lg bg-dn-primary/15">
              <Icon name={value} className="text-dn-primary text-xl shrink-0" />
              <span className="text-xs text-dn-primary flex-1 truncate">{value}</span>
              <button
                type="button"
                onClick={() => onChange?.('')}
                className="text-dn-primary/60 hover:text-dn-error transition-colors"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </div>
          )}

          {/* Icon grid */}
          <div className="h-52 overflow-y-auto p-2">
            {icons.length === 0 ? (
              <p className="text-xs text-dn-text-muted text-center py-6">
                {t('iconPicker.noResults')}
              </p>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {icons.map((name) => {
                  const isSelected = value === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      onClick={() => handleSelect(name)}
                      className={[
                        'flex items-center justify-center w-9 h-9 rounded-lg transition-all active:scale-90',
                        isSelected
                          ? 'bg-dn-primary text-dn-bg'
                          : 'text-dn-text-muted hover:bg-dn-surface hover:text-dn-text-main',
                      ].join(' ')}
                    >
                      <Icon name={name} className="text-xl" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {isLimited && (
            <p className="text-xs text-dn-text-muted text-center pb-2">
              {t('iconPicker.showingCount', { count: MAX_UNFILTERED, total: ALL_ICONS.length })}
            </p>
          )}
        </div>

        {error && <p className="text-xs text-dn-error">{error}</p>}
      </div>

      {modalOpen && (
        <BrowseModal
          currentValue={value}
          onSelect={handleModalSelect}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
