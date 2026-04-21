import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { EventModalFiltersState } from '@/hooks/useEventModalFilters';
import type { DateField } from '@/services/events.service';
import type { Category, Tag } from '@/models';

type EventNodeFilterItem = {
  id: number;
  name: string;
};

type EventSearchbarFilterProps = {
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
  children: (filterButton: ReactNode) => ReactNode;
};

export function EventSearchbarFilter({
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

  const activeCategories = categories.filter((category) => !category.archived);
  const activeTags = tags.filter((tag) => !tag.archived);
  const hasActiveDateRange = filters.startDate !== '' || filters.endDate !== '';
  const hasActiveNode = filters.nodeId !== undefined;

  const filterButton = (
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
  );

  return (
    <>
      {showFilters && (
        <div className="space-y-4 rounded-3xl p-4 border border-white/5">
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={() => setIsFilterPanelCollapsed((value) => !value)}
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
                  onChange={(event) => onStartDateChange(event.target.value)}
                />
                <Input
                  type="date"
                  label={t('events.endDate')}
                  value={filters.endDate}
                  onChange={(event) => onEndDateChange(event.target.value)}
                />
              </div>

              {activeCategories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">
                    {t('common.category')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          onToggleCategory(category.id);
                          onPageReset?.();
                        }}
                        className={[
                          'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer',
                          filters.categoryIds.includes(category.id)
                            ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                            : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
                        ].join(' ')}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">
                    {t('common.tag')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          onToggleTag(tag.id);
                          onPageReset?.();
                        }}
                        className={[
                          'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer',
                          filters.tagIds.includes(tag.id)
                            ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                            : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
                        ].join(' ')}
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
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
            </>
          )}
        </div>
      )}

      {children(filterButton)}
    </>
  );
}
