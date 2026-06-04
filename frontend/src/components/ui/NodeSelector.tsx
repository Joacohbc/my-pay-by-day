import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { normalizeText } from '@/lib/utils/textUtils';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { NodeIcon } from '@/components/ui/NodeIcon';
import type { FinanceNode, FinanceNodeType } from '@/models';
import { sortByUsage, getSortIcon, nextSortMode } from '@/lib/usageSorter';
import type { SortMode } from '@/lib/usageSorter';
import { useUsageStats } from '@/hooks/useSelectionHistory';

type NodeSelectorProps = {
  nodes: FinanceNode[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  label?: string;
  className?: string;
  collapsible?: boolean;
  sortMode?: SortMode;
  onSortModeChange?: (mode: SortMode) => void;
};

const TYPE_FILTERS: Array<FinanceNodeType | 'ALL'> = ['ALL', 'OWN', 'EXTERNAL', 'CONTACT'];

export function NodeSelector({
  nodes,
  value,
  onChange,
  label,
  className = '',
  collapsible = false,
  sortMode: sortModeProp,
  onSortModeChange,
}: NodeSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!collapsible);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FinanceNodeType | 'ALL'>('ALL');
  const [internalSortMode, setInternalSortMode] = useState<SortMode>('smart');
  const debouncedSearch = useDebounce(search, 150);

  const sortMode = sortModeProp ?? internalSortMode;
  const { data: stats } = useUsageStats('FINANCE_NODE');

  const resolvedLabel = label ?? t('events.filterNode');
  const hasValue = value !== undefined;

  const cycleSortMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextSortMode(sortMode);
    if (onSortModeChange) onSortModeChange(next);
    else setInternalSortMode(next);
  };

  const filteredNodes = useMemo(() => {
    let result = sortByUsage(nodes.filter((n) => !n.archived), stats ?? [], sortMode);
    if (typeFilter !== 'ALL') result = result.filter((n) => n.type === typeFilter);
    if (debouncedSearch.trim()) {
      result = result.filter((n) => normalizeText(n.name).includes(normalizeText(debouncedSearch)));
    }
    return result;
  }, [nodes, stats, sortMode, typeFilter, debouncedSearch]);

  const handleToggle = (id: number) => {
    onChange(value === id ? undefined : id);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <p
          className={[
            'text-xs font-medium text-dn-text-muted uppercase tracking-wider',
            collapsible ? 'flex items-center gap-1 hover:text-dn-text-main transition-colors cursor-pointer select-none' : '',
          ].join(' ')}
          onClick={collapsible ? () => setOpen((v) => !v) : undefined}
        >
          {collapsible && hasValue && (
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

      {open && (
        <div>
          {/* Type filter */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {TYPE_FILTERS.map((tv) => (
              <button
                key={tv}
                type="button"
                onClick={() => setTypeFilter(tv)}
                className={[
                  'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter border transition-colors',
                  typeFilter === tv
                    ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                    : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
                ].join(' ')}
              >
                {tv === 'ALL' ? t('common.all') : t(`nodeType.${tv}`)}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dn-text-muted text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="w-full bg-dn-surface-low rounded-input pl-8 pr-3 py-1.5 text-xs text-dn-text-main outline-none focus:ring-1 focus:ring-dn-primary/50 placeholder:text-dn-text-muted/50"
            />
          </div>

          <div className="grid grid-cols-4 gap-x-3 gap-y-4">
            {filteredNodes.map((node) => {
              const selected = value === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => handleToggle(node.id)}
                  className="flex flex-col items-center gap-2"
                >
                  <NodeIcon
                    node={node}
                    size="lg"
                    colorClass={selected ? 'bg-dn-primary text-dn-bg' : undefined}
                    className="transition-all active:scale-95"
                  />
                  <span
                    className={[
                      'text-xs text-center font-medium leading-tight',
                      selected ? 'text-dn-primary' : 'text-dn-text-muted',
                    ].join(' ')}
                  >
                    {node.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
