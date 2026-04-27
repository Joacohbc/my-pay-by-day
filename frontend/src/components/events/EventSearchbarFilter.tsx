import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import type { EventModalFiltersState } from '@/hooks/useEventModalFilters';
import type { DateField } from '@/services/events.service';
import type { Category, Tag } from '@/models';

type EventNodeFilterItem = {
  id: number;
  name: string;
};

type EventSearchbarFilterProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showFilters: boolean;
  hasAnyFilter: boolean;
  filters: EventModalFiltersState;
  categories: Category[];
  tags: Tag[];
  nodes: EventNodeFilterItem[];
  onToggleFilters: () => void;
  onResetFilters: () => void;
  onToggleCategory: (id: number) => void;
  onToggleTag: (id: number) => void;
  onDateFieldChange: (field: DateField) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onNodeIdChange: (nodeId: number | undefined) => void;
  onPageReset?: () => void;
  children?: ReactNode;
};

export function EventSearchbarFilter({
  search,
  onSearchChange,
  searchPlaceholder,
  showFilters,
  hasAnyFilter,
  filters,
  categories,
  tags,
  nodes,
  onToggleFilters,
  onResetFilters,
  onToggleCategory,
  onToggleTag,
  onDateFieldChange,
  onStartDateChange,
  onEndDateChange,
  onNodeIdChange,
  onPageReset,
  children,
}: EventSearchbarFilterProps) {
  const { t } = useTranslation();
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(false);

  const hasActiveDateRange = filters.startDate !== '' || filters.endDate !== '';
  const hasActiveNode = filters.nodeId !== undefined;

  return (
    <>
      {showFilters && (
        <div className="space-y-4 rounded-3xl p-4 border border-white/5 cursor-pointer">
          <div className="flex items-center justify-between gap-2 px-1"
            onClick={() => setIsFilterPanelCollapsed((value) => !value)}>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 min-w-0"
            >
              <span className="text-sm font-medium text-dn-text-main">{t('common.filters')}</span>
              <Icon
                name={isFilterPanelCollapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
                className="text-base text-dn-text-muted"
              />
            </button>
            <div className="flex items-center gap-3">
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-xs text-dn-primary font-medium hover:text-dn-primary/80"
                >
                  {t('common.clearFilters')}
                </button>
              )}
            </div>
          </div>
          {isFilterPanelCollapsed && hasAnyFilter && (
            <div className="flex flex-wrap gap-2 px-1">
              {filters.categoryIds.length > 0 && (
                <span className="px-2.5 py-1 rounded-pill text-xs font-medium bg-dn-primary/20 border border-dn-primary/30 text-dn-primary">
                  {t('common.category')}: {filters.categoryIds.length}
                </span>
              )}
              {filters.tagIds.length > 0 && (
                <span className="px-2.5 py-1 rounded-pill text-xs font-medium bg-dn-primary/20 border border-dn-primary/30 text-dn-primary">
                  {t('common.tag')}: {filters.tagIds.length}
                </span>
              )}
              {hasActiveDateRange && (
                <span className="px-2.5 py-1 rounded-pill text-xs font-medium bg-dn-primary/20 border border-dn-primary/30 text-dn-primary">
                  {t('events.dateField')}
                </span>
              )}
              {hasActiveNode && (
                <span className="px-2.5 py-1 rounded-pill text-xs font-medium bg-dn-primary/20 border border-dn-primary/30 text-dn-primary">
                  {t('events.filterNode')}
                </span>
              )}
            </div>
          )}

          {!isFilterPanelCollapsed && (
            <>
              <SearchableSelect
                label={t('events.dateField')}
                value={filters.dateField}
                options={[
                  { value: 'TRANSACTION', label: t('events.dateFieldTransaction') },
                  { value: 'CREATED', label: t('events.dateFieldCreated') },
                  { value: 'UPDATED', label: t('events.dateFieldUpdated') },
                ]}
                onChange={(value) => onDateFieldChange((value as DateField) || 'TRANSACTION')}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  label={t('events.startDate')}
                  value={filters.startDate}
                  onChange={(event) => {
                    onStartDateChange(event.target.value);
                    onPageReset?.();
                  }}
                />
                <Input
                  type="date"
                  label={t('events.endDate')}
                  value={filters.endDate}
                  onChange={(event) => {
                    onEndDateChange(event.target.value);
                    onPageReset?.();
                  }}
                />
              </div>

              {categories.length > 0 && (
                <CategorySelector
                  multiSelect
                  categories={categories}
                  value={filters.categoryIds.map(String)}
                  onChange={(newIds) => {
                    const prev = filters.categoryIds.map(String);
                    [...newIds.filter(id => !prev.includes(id)), ...prev.filter(id => !newIds.includes(id))]
                      .forEach(id => onToggleCategory(Number(id)));
                    onPageReset?.();
                  }}
                  showAdd={false}
                />
              )}

              {tags.length > 0 && (
                <TagSelector
                  tags={tags}
                  value={filters.tagIds.map(String)}
                  onChange={(newIds) => {
                    const prev = filters.tagIds.map(String);
                    [...newIds.filter(id => !prev.includes(id)), ...prev.filter(id => !newIds.includes(id))]
                      .forEach(id => onToggleTag(Number(id)));
                    onPageReset?.();
                  }}
                  showAdd={false}
                />
              )}

              {nodes.length > 0 && (
                <SearchableSelect
                  label={t('events.filterNode')}
                  value={filters.nodeId ?? ''}
                  options={[
                    { value: '', label: t('events.filterNodePlaceholder') },
                    ...nodes.map((node) => ({ value: node.id, label: node.name })),
                  ]}
                  onChange={(value) => {
                    onNodeIdChange(value ? Number(value) : undefined);
                    onPageReset?.();
                  }}
                  placeholder={t('events.filterNodePlaceholder')}
                />
              )}

              <div className="flex justify-center items-center cursor-pointer" 
                onClick={() => setIsFilterPanelCollapsed((value) => !value)}>
                <Icon name="keyboard_arrow_up" className="text-xl" />
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-xl"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? t('events.searchPlaceholder')}
            className="w-full bg-dn-surface-low rounded-input pl-10 pr-3 py-3 text-sm text-dn-text-main placeholder-dn-text-muted focus:outline-none focus:ring-2 focus:ring-dn-primary/30 scheme-dark"
          />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          className="shrink-0 aspect-square p-0 w-4 flex items-center justify-center rounded-input"
          onClick={onToggleFilters}
        >
          {showFilters ? (
            <Icon name="filter_alt_off" className="text-xl" />
          ) : (
            <Icon name="filter_alt" className={`text-xl${hasAnyFilter ? ' text-dn-primary' : ''}`} />
          )}
        </Button>
      </div>

      {children}
    </>
  );
}
