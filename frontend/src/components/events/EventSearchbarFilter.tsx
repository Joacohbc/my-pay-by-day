import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { DynamicTimePeriodSelector, type DynamicPeriodOption } from '@/components/time-periods/DynamicTimePeriodSelector';
import type { EventModalFiltersState } from '@/hooks/useEventModalFilters';
import type { DateField } from '@/services/events.service';
import type { Category, Tag } from '@/models';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { getDynamicPeriodDates } from '@/lib/utils/dateUtils';

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
  const { data: pagedTimePeriods } = useTimePeriods(0, 100);
  const timePeriods = pagedTimePeriods?.content || [];
  const [selectedDynamicPeriod, setSelectedDynamicPeriod] = useState<DynamicPeriodOption | undefined>();
  const [selectedTimePeriodId, setSelectedTimePeriodId] = useState<string>('');

  const handleDynamicPeriodChange = (option: DynamicPeriodOption) => {
    setSelectedDynamicPeriod(option);
    setSelectedTimePeriodId('');
    const { startDate, endDate } = getDynamicPeriodDates(option);
    onStartDateChange(startDate);
    onEndDateChange(endDate);
    onPageReset?.();
  };

  const handleTimePeriodChange = (val: string | number | null) => {
    const idStr = String(val || '');
    setSelectedTimePeriodId(idStr);
    setSelectedDynamicPeriod(undefined);
    if (!idStr) return;
    const tp = timePeriods.find((t) => String(t.id) === idStr);
    if (tp) {
      onStartDateChange(tp.startDate);
      onEndDateChange(tp.endDate);
      onPageReset?.();
    }
  };

  const [approxBaseDate, setApproxBaseDate] = useState<string>('');
  const [approxVarianceDays, setApproxVarianceDays] = useState<number>(3);

  const applyApproximateTime = () => {
    if (!approxBaseDate) return;
    const base = new Date(approxBaseDate);
    // Because input type date returns "YYYY-MM-DD", let's parse it correctly or just add days
    // to avoid timezone shifts. Let's use getUTCDate and setUTCDate to be safe if parsing "YYYY-MM-DD".

    // Simple way, create dates and format back to YYYY-MM-DD
    const start = new Date(base);
    start.setUTCDate(base.getUTCDate() - approxVarianceDays);

    const end = new Date(base);
    end.setUTCDate(base.getUTCDate() + approxVarianceDays);

    const formatDate = (date: Date) => {
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(date.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    onStartDateChange(formatDate(start));
    onEndDateChange(formatDate(end));
    onPageReset?.();
  };

  const hasActiveDateRange = filters.startDate !== '' || filters.endDate !== '';
  const hasActiveNode = filters.nodeId !== undefined;

  return (
    <>
      <Modal open={showFilters} onClose={onToggleFilters} title={t('common.filters')}>
        <div className="space-y-6">
          <div className="flex justify-end">
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

          {/* Time Periods */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-dn-text-main">{t('common.timePeriod')}</h3>
            <DynamicTimePeriodSelector
              value={selectedDynamicPeriod as DynamicPeriodOption}
              onChange={handleDynamicPeriodChange}
            />
            {timePeriods.length > 0 && (
              <SearchableSelect
                label={t('common.timePeriod')}
                value={selectedTimePeriodId}
                options={[
                  { value: '', label: t('common.select') },
                  ...timePeriods.map((tp) => ({ value: String(tp.id), label: tp.name })),
                ]}
                onChange={handleTimePeriodChange}
                placeholder={t('common.select')}
              />
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-dn-text-main">{t('events.dateField')}</h3>
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
          </div>

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

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-dn-text-main">{t('events.approximateTime')}</h3>
            <div className="grid grid-cols-2 gap-3 items-end">
              <Input
                type="date"
                label={t('events.baseDate')}
                value={approxBaseDate}
                onChange={(e) => setApproxBaseDate(e.target.value)}
              />
              <Input
                type="number"
                label={t('events.varianceDays')}
                value={String(approxVarianceDays)}
                onChange={(e) => setApproxVarianceDays(Number(e.target.value))}
                min="0"
              />
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={applyApproximateTime}
              disabled={!approxBaseDate}
            >
              {t('events.applyApproximate')}
            </Button>
          </div>

          {categories.length > 0 && (
            <details className="group border border-white/5 rounded-2xl overflow-hidden bg-dn-surface">
              <summary className="flex items-center justify-between p-4 cursor-pointer marker:hidden list-none font-medium text-sm text-dn-text-main group-open:border-b group-open:border-white/5">
                {t('common.category')}
                <Icon name="keyboard_arrow_down" className="text-xl text-dn-text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="p-4">
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
              </div>
            </details>
          )}

          {tags.length > 0 && (
            <details className="group border border-white/5 rounded-2xl overflow-hidden bg-dn-surface">
              <summary className="flex items-center justify-between p-4 cursor-pointer marker:hidden list-none font-medium text-sm text-dn-text-main group-open:border-b group-open:border-white/5">
                {t('common.tag')}
                <Icon name="keyboard_arrow_down" className="text-xl text-dn-text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="p-4">
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
              </div>
            </details>
          )}

          {nodes.length > 0 && (
            <details className="group border border-white/5 rounded-2xl overflow-hidden bg-dn-surface">
              <summary className="flex items-center justify-between p-4 cursor-pointer marker:hidden list-none font-medium text-sm text-dn-text-main group-open:border-b group-open:border-white/5">
                {t('events.filterNode')}
                <Icon name="keyboard_arrow_down" className="text-xl text-dn-text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="p-4">
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
              </div>
            </details>
          )}
        </div>
      </Modal>

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

      {hasAnyFilter && (
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

      {children}
    </>
  );
}
