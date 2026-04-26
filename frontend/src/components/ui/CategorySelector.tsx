import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { Icon } from '@/components/ui/Icon';
import type { Category } from '@/models';
import { sortByUsage, getSortIcon, nextSortMode } from '@/lib/usageSorter';
import type { SortMode } from '@/lib/usageSorter';
import { useUsageStats, useRecordSelection } from '@/hooks/useSelectionHistory';


type CategorySelectorBase = {
  categories: Category[];
  /** 'grid' renders an icon grid (default). 'select' renders a SearchableSelect dropdown. */
  variant?: 'grid' | 'select';
  label?: string;
  className?: string;
  showAdd?: boolean;
  collapsible?: boolean;
  /** Override the active sort mode from outside (controlled). Omit to let the selector manage it. */
  sortMode?: SortMode;
  onSortModeChange?: (mode: SortMode) => void;
};

type SingleCategoryProps = CategorySelectorBase & {
  multiSelect?: false;
  value: string | number;
  onChange: (id: string) => void;
};

type MultiCategoryProps = CategorySelectorBase & {
  multiSelect: true;
  value: string[];
  onChange: (ids: string[]) => void;
};

type CategorySelectorProps = SingleCategoryProps | MultiCategoryProps;

export function CategorySelector(props: CategorySelectorProps) {
  const {
    categories,
    variant = 'grid',
    label,
    className = '',
    showAdd = false,
    collapsible = false,
    sortMode: sortModeProp,
    onSortModeChange,
  } = props;

  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [open, setOpen] = useState(!collapsible);
  const toggleOpen = useCallback(() => setOpen((v) => !v), []);

  const [internalSortMode, setInternalSortMode] = useState<SortMode>('smart');
  const sortMode = sortModeProp ?? internalSortMode;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 150);

  const { data: stats } = useUsageStats('CATEGORY');
  const recordSelection = useRecordSelection();

  const sortedCategories = useMemo(
    () => sortByUsage(categories.filter(c => !c.archived), stats ?? [], sortMode),
    [categories, stats, sortMode]
  );

  const filteredCategories = useMemo(
    () => debouncedSearch.trim()
      ? sortedCategories.filter((c) => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
      : sortedCategories,
    [sortedCategories, debouncedSearch]
  );

  const archivedSelectedCat = useMemo(() => {
    if (props.multiSelect) return undefined;
    return categories.find(c => c.archived && String(c.id) === String(props.value));
  }, [categories, props]);

  const resolvedLabel = label ?? t('eventForm.category');

  const cycleSortMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextSortMode(sortMode);
    if (onSortModeChange) onSortModeChange(next);
    else setInternalSortMode(next);
  };

  const isSelected = (catId: string): boolean => {
    if (props.multiSelect) return props.value.includes(catId);
    return String(props.value) === catId;
  };

  const handleGridClick = (catId: string) => {
    if (props.multiSelect) {
      const current = props.value;
      if (current.includes(catId)) {
        props.onChange(current.filter(id => id !== catId));
      } else {
        props.onChange([...current, catId]);
        recordSelection.mutate({ type: 'CATEGORY', id: Number(catId) });
      }
    } else {
      const next = String(props.value) === catId ? '' : catId;
      props.onChange(next);
      if (next) recordSelection.mutate({ type: 'CATEGORY', id: Number(next) });
    }
  };

  const handleSelectChange = (val: string) => {
    if (!props.multiSelect) {
      props.onChange(val);
      if (val) recordSelection.mutate({ type: 'CATEGORY', id: Number(val) });
    }
  };

  const hasValue = props.multiSelect ? props.value.length > 0 : !!props.value;


  if (variant === 'select') {
    const options = sortedCategories.map((c) => ({ value: String(c.id), label: c.name }));
    const selectValue = props.multiSelect ? '' : (archivedSelectedCat ? '' : props.value);
    return (
      <div className={className}>
        {archivedSelectedCat && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-input bg-dn-surface-low border border-white/5 opacity-60">
            <CategoryIcon category={archivedSelectedCat} size="sm" />
            <span className="text-sm text-dn-text-muted flex-1 truncate">{archivedSelectedCat.name}</span>
            <span className="text-xs text-dn-text-muted border border-white/10 px-1.5 py-0.5 rounded">{t('common.archived')}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchableSelect
              label={resolvedLabel}
              placeholder={t('common.none')}
              options={options}
              value={selectValue}
              onChange={(val) => handleSelectChange(val == null ? '' : String(val))}
            />
          </div>
          <button
            type="button"
            onClick={cycleSortMode}
            className="mt-6 p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
            title={`${t('common.sort')}: ${sortMode}`}
          >
            <Icon name={getSortIcon(sortMode)} className="text-xl" />
          </button>
          {showAdd && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-6 p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
              title={t('categories.addCategory')}
            >
              <Icon name="add_circle" className="text-xl" />
            </button>
          )}
        </div>
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={t('categories.newCategory')}
        >
          <CategoryForm
            onSuccess={(newCat) => {
              handleSelectChange(String(newCat.id));
              setShowModal(false);
            }}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      </div>
    );
  }


  // variant === 'grid'
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <p
          className={[
            'text-xs font-medium text-dn-text-muted uppercase tracking-wider',
            collapsible ? 'flex items-center gap-1 hover:text-dn-text-main transition-colors cursor-pointer select-none' : '',
          ].join(' ')}
          onClick={collapsible ? toggleOpen : undefined}
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

      {open && <div>
        {archivedSelectedCat && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-input bg-dn-surface-low border border-white/5 opacity-60">
            <CategoryIcon category={archivedSelectedCat} size="sm" />
            <span className="text-sm text-dn-text-muted flex-1 truncate">{archivedSelectedCat.name}</span>
            <span className="text-xs text-dn-text-muted border border-white/10 px-1.5 py-0.5 rounded">{t('common.archived')}</span>
          </div>
        )}
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
        {filteredCategories.map((cat) => {
          const selected = isSelected(String(cat.id));
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleGridClick(String(cat.id))}
              className="flex flex-col items-center gap-2"
            >
              <CategoryIcon
                category={cat}
                size="lg"
                colorClass={selected ? 'bg-dn-primary text-dn-bg' : 'bg-dn-surface text-dn-text-muted'}
                className="transition-all active:scale-95"
              />
              <span
                className={[
                  'text-xs text-center font-medium leading-tight',
                  selected ? 'text-dn-primary' : 'text-dn-text-muted',
                ].join(' ')}
              >
                {cat.name}
              </span>
            </button>
          );
        })}

        {showAdd && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-full bg-dn-surface-low text-dn-text-muted flex items-center justify-center border border-dashed border-white/10 hover:border-dn-primary/30 hover:text-dn-primary transition-all active:scale-95">
              <Icon name="add" className="text-xl" />
            </div>
            <span className="text-xs text-center font-medium leading-tight text-dn-text-muted">
              {t('common.new')}
            </span>
          </button>
        )}
        </div>
      </div>}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('categories.newCategory')}
      >
        <CategoryForm
          onSuccess={(newCat) => {
            if (!props.multiSelect) props.onChange(String(newCat.id));
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
