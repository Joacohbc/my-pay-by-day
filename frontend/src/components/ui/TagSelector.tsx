import { useState, useMemo } from 'react';
import { normalizeText } from '@/lib/utils/textUtils';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { TagForm } from '@/components/tags/TagForm';
import { Icon } from '@/components/ui/Icon';
import type { Tag } from '@/models';
import { sortByUsage, getSortIcon, nextSortMode } from '@/lib/usageSorter';
import type { SortMode } from '@/lib/usageSorter';
import { useUsageStats, useRecordSelection } from '@/hooks/useSelectionHistory';

interface TagSelectorProps {
  tags: Tag[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  className?: string;
  showAdd?: boolean;
  /** When true the list starts collapsed (default: false) */
  collapsible?: boolean;
  error?: string;
  /** Override the active sort mode from outside (controlled). Omit to let the selector manage it. */
  sortMode?: SortMode;
  onSortModeChange?: (mode: SortMode) => void;
}

export function TagSelector({
  tags,
  value,
  onChange,
  label,
  className = '',
  showAdd = false,
  collapsible = false,
  error,
  sortMode: sortModeProp,
  onSortModeChange,
}: TagSelectorProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [open, setOpen] = useState(!collapsible);

  const [internalSortMode, setInternalSortMode] = useState<SortMode>('smart');
  const sortMode = sortModeProp ?? internalSortMode;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 150);

  const { data: stats } = useUsageStats('TAG');
  const recordSelection = useRecordSelection();

  const sortedTags = useMemo(
    () => sortByUsage(tags.filter(t => !t.archived), stats ?? [], sortMode),
    [tags, stats, sortMode]
  );

  const filteredTags = useMemo(
    () => debouncedSearch.trim()
      ? sortedTags.filter((t) => normalizeText(t.name).includes(normalizeText(debouncedSearch)))
      : sortedTags,
    [sortedTags, debouncedSearch]
  );

  const archivedSelectedTags = useMemo(
    () => tags.filter(t => t.archived && value?.includes(String(t.id))),
    [tags, value]
  );

  const resolvedLabel = label ?? t('eventForm.tags');

  const anySelected = value?.length > 0;

  const cycleSortMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextSortMode(sortMode);
    if (onSortModeChange) onSortModeChange(next);
    else setInternalSortMode(next);
  };

  const handleToggleTag = (tag: Tag) => {
    const current = value ?? [];
    const tagIdStr = String(tag.id);
    const isSelected = current.includes(tagIdStr);

    if (isSelected) {
      onChange(current.filter((id) => id !== tagIdStr));
    } else {
      onChange([...current, tagIdStr]);
      recordSelection.mutate({ type: 'TAG', id: tag.id });
    }
  };

  const header = (
    <div className="flex items-center justify-between mb-2">
      <p
        className={[
          'text-xs font-medium text-dn-text-muted uppercase tracking-wider',
          collapsible ? 'flex items-center gap-1 hover:text-dn-text-main transition-colors cursor-pointer select-none' : '',
        ].join(' ')}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        {collapsible && anySelected && (
          <span className="w-1.5 h-1.5 rounded-full bg-dn-primary inline-block mr-0.5" />
        )}
        {resolvedLabel}
        {collapsible && <Icon name={open ? 'expand_less' : 'expand_more'} className="text-sm" />}
      </p>

      <button
        type="button"
        onClick={cycleSortMode}
        className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-tighter text-dn-text-muted hover:text-dn-primary transition-colors bg-dn-surface-low px-2 py-0.5 rounded-full"
        title={`${t('common.sort')}: ${sortMode}`}
      >
        <Icon name={getSortIcon(sortMode)} className="text-xs" />
        {sortMode}
      </button>
    </div>
  );

  return (
    <div className={className}>
      {header}


      {open && (
        <div>
          {archivedSelectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {archivedSelectedTags.map(tag => (
                <span
                  key={tag.id}
                  className="px-3 py-1.5 rounded-pill text-xs font-medium border border-white/5 bg-dn-surface-low text-dn-text-muted opacity-60 flex items-center gap-1.5"
                >
                  #{tag.name}
                  <span className="border border-white/10 px-1 py-px rounded text-[10px]">{t('common.archived')}</span>
                </span>
              ))}
            </div>
          )}
          <div className="relative mb-2">
            <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dn-text-muted text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="w-full bg-dn-surface-low rounded-input pl-8 pr-3 py-1.5 text-xs text-dn-text-main outline-none focus:ring-1 focus:ring-dn-primary/50 placeholder:text-dn-text-muted/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
          {filteredTags.map((tag) => {
            const selected = value?.includes(String(tag.id));
            const colorStyle = tag.color
              ? selected
                ? {
                    color: tag.color,
                    backgroundColor: `${tag.color}33`,
                    borderColor: tag.color,
                    boxShadow: `0 0 0 1px ${tag.color}`,
                  }
                : {
                    color: tag.color,
                    backgroundColor: `${tag.color}1A`,
                    borderColor: `${tag.color}26`,
                  }
              : undefined;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleToggleTag(tag)}
                style={colorStyle}
                className={[
                  'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1',
                  colorStyle
                    ? ''
                    : selected
                      ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                      : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
                ].join(' ')}
              >
                {selected && <Icon name="check" className="text-sm" />}
                #{tag.name}
              </button>
            );
          })}

          {showAdd && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 rounded-pill text-xs font-medium border border-dashed border-white/10 bg-dn-surface-low text-dn-text-muted hover:border-dn-primary/30 hover:text-dn-primary transition-all cursor-pointer flex items-center gap-1"
            >
              <Icon name="add" className="text-sm" />
              {t('common.new')}
            </button>
          )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-dn-error">{error}</p>}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('tags.newTag')}
      >
        <TagForm
          onSuccess={(newTag) => {
            onChange([...(value ?? []), String(newTag.id)]);
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
