import { useState, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { TagSelector } from '@/components/ui/TagSelector';
import { NodeSelector } from '@/components/ui/NodeSelector';
import { DynamicTimePeriodSelector, type DynamicPeriodOption } from '@/components/time-periods/DynamicTimePeriodSelector';
import type { EventModalFiltersState } from '@/hooks/useEventModalFilters';
import type { DateField } from '@/services/events.service';
import type { Category, FinanceNode, Tag } from '@/models';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useDebounceCallback } from '@/hooks/useDebounce';
import { getDynamicPeriodDates, fromServerDate, toServerDate } from '@/lib/utils/dateUtils';
import { formatIsoDate, withTime, getDateFormat } from '@/lib/utils/dateFormat';

const formatForDatetimeLocal = (val: string | undefined, isEnd: boolean) => {
  if (!val) return '';
  const localStr = fromServerDate(val);
  if (localStr.length === 10) return `${localStr}T${isEnd ? '23:59' : '00:00'}`;
  return localStr.slice(0, 16);
};

export interface FilterPill {
  label: string;
  value: string;
  badge?: number;
}

type EventSearchbarFilterProps = {
  search: string;
  searchPlaceholder?: string;
  showFilters: boolean;
  hasAnyFilter: boolean;
  filters: EventModalFiltersState;
  categories: Category[];
  tags: Tag[];
  nodes: FinanceNode[];
  pills?: PillsConfig;
  onSearchChange: (value: string) => void;
  onToggleFilters: () => void;
  onResetFilters: () => void;
  onToggleCategory: (id: number) => void;
  onToggleTag: (id: number) => void;
  onDateFieldChange: (field: DateField) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onNodeIdChange: (nodeId: number | undefined) => void;
  onMinAmountChange: (value: number | undefined) => void;
  onMaxAmountChange: (value: number | undefined) => void;
  onFiltersChange?: () => void;
  searchTrailing?: ReactNode;
  children?: ReactNode;
};

export type PillsConfig = {
  items?: FilterPill[];
  active?: string;
  onChange?: (v: string) => void;
  position?: 'modal' | 'inline';
};

type PillButtonsProps = {
  pills: FilterPill[];
  activePill?: string;
  onPillChange?: (v: string) => void;
};

function PillButtons({ pills, activePill, onPillChange }: PillButtonsProps) {
  return (
    <>
      {pills.map(({ label, value, badge }) => (
        <button
          key={value}
          onClick={() => onPillChange?.(value)}
          className={[
            'shrink-0 px-4 py-1.5 rounded-pill text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
            activePill === value
              ? 'bg-dn-primary/20 text-dn-primary'
              : 'bg-dn-surface-low text-dn-text-muted hover:bg-dn-surface',
          ].join(' ')}
        >
          {label}
          {typeof badge === 'number' && badge > 0 && (
            <span className="bg-dn-error text-white text-[10px] leading-tight font-semibold px-1.5 py-0.5 rounded-full min-w-4.5 text-center inline-block">
              {badge}
            </span>
          )}
        </button>
      ))}
    </>
  );
}

export type EventSearchbarFilterHandle = { reset(): void };

export const EventSearchbarFilter = forwardRef<EventSearchbarFilterHandle, EventSearchbarFilterProps>(function EventSearchbarFilter({
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
  onDateRangeChange,
  onNodeIdChange,
  onMinAmountChange,
  onMaxAmountChange,
  pills,
  onFiltersChange,
  searchTrailing,
  children,
}: EventSearchbarFilterProps, ref) {
  const { t } = useTranslation();

  const { items: filterPills, active: activePill, onChange: onPillChange, position: pillsPosition = 'modal' } = pills ?? {};

  const defaultPills: FilterPill[] = [
    { label: t('common.all'), value: 'ALL' },
    { label: t('events.income'), value: 'INBOUND' },
    { label: t('events.expenses'), value: 'OUTBOUND' },
    { label: t('events.transfers'), value: 'OTHER' },
  ];

  const pillsToRender = filterPills ?? (onPillChange ? defaultPills : undefined);

  const { data: pagedTimePeriods } = useTimePeriods(0, 100);
  const timePeriods = pagedTimePeriods?.content || [];
  const [selectedDynamicPeriod, setSelectedDynamicPeriod] = useState<DynamicPeriodOption | undefined>();
  const [selectedTimePeriodId, setSelectedTimePeriodId] = useState<string>('');

  const handleDynamicPeriodChange = (option: DynamicPeriodOption) => {
    setSelectedDynamicPeriod(option);
    setSelectedTimePeriodId('');

    const { startDate, endDate } = getDynamicPeriodDates(option);
    onDateRangeChange(startDate, endDate);
    onFiltersChange?.();
  };

  const handleTimePeriodChange = (val: string | number | null) => {
    const idStr = String(val || '');
    setSelectedTimePeriodId(idStr);
    setSelectedDynamicPeriod(undefined);
    if (!idStr) {
      onDateRangeChange('', '');
      onFiltersChange?.();
      return;
    }
    const tp = timePeriods.find((t) => String(t.id) === idStr);
    if (tp) {
      onDateRangeChange(tp.startDate, tp.endDate);
      onFiltersChange?.();
    }
  };

  const [approxBaseDate, setApproxBaseDate] = useState<string>('');
  const [approxVarianceDays, setApproxVarianceDays] = useState<number>(0);
  const [dateMode, setDateMode] = useState<'exact' | 'approx'>('exact');

  useImperativeHandle(ref, () => ({
    reset() {
      setSelectedDynamicPeriod(undefined);
      setSelectedTimePeriodId('');
      setApproxBaseDate('');
      setApproxVarianceDays(0);
      setDateMode('exact');
    },
  }));

  const applyApproximateTime = useDebounceCallback((baseDateStr: string, varianceDaysNum: number) => {
    if (!baseDateStr) {
      onDateRangeChange('', '');
      onFiltersChange?.();
      return;
    }

    const base = new Date(baseDateStr);

    const start = new Date(base);
    start.setDate(base.getDate() - varianceDaysNum);

    const end = new Date(base);
    end.setDate(base.getDate() + varianceDaysNum);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startLocalStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const endLocalStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;

    onDateRangeChange(toServerDate(startLocalStr), toServerDate(endLocalStr));
    onFiltersChange?.();
  }, 400);

  const handleDateModeChange = (mode: 'exact' | 'approx') => {
    if (mode !== dateMode) {
      if (mode === 'approx') {
        onDateRangeChange('', '');
        setApproxBaseDate('');
        setApproxVarianceDays(0);
      }
      setDateMode(mode);
      onFiltersChange?.();
    }
  };

  const hasActiveDateRange = filters.startDate !== '' || filters.endDate !== '';
  const hasActiveNode = filters.nodeId !== undefined;
  const hasActiveAmountRange = filters.minAmount !== undefined || filters.maxAmount !== undefined;

  return (
    <>
      <Modal open={showFilters} onClose={onToggleFilters} title={t('common.filters')}>
        <div className="space-y-3">
          <div className="flex justify-end">
            {hasAnyFilter && (
              <button
                type="button"
                onClick={() => {
                  onResetFilters();
                  setSelectedDynamicPeriod(undefined);
                  setSelectedTimePeriodId('');
                  setApproxBaseDate('');
                  setApproxVarianceDays(0);
                  setDateMode('exact');
                }}
                className="text-xs text-dn-primary font-medium hover:text-dn-primary/80 mt-[-1]"
              >
                {t('common.clearFilters')}
              </button>
            )}
          </div>

          {pillsPosition === 'modal' && pillsToRender && pillsToRender.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-dn-text-main">{t('events.eventType')}</h3>
              <div className="flex gap-2 flex-wrap">
                <PillButtons pills={pillsToRender} activePill={activePill} onPillChange={onPillChange} />
              </div>
            </div>
          )}

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

          <div className="space-y-3">
            <SegmentedControl
              options={[
                { value: 'exact', label: t('events.exactDates') },
                { value: 'approx', label: t('events.approximateTime') },
              ]}
              value={dateMode}
              onChange={handleDateModeChange}
            />

            {dateMode === 'exact' ? (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="datetime-local"
                  label={t('events.startDate')}
                  value={formatForDatetimeLocal(filters.startDate, false)}
                  onChange={(event) => {
                    const serverDate = event.target.value ? toServerDate(event.target.value) : '';
                    onDateRangeChange(serverDate, filters.endDate);
                    onFiltersChange?.();
                  }}
                />
                <Input
                  type="datetime-local"
                  label={t('events.endDate')}
                  value={formatForDatetimeLocal(filters.endDate, true)}
                  onChange={(event) => {
                    const serverDate = event.target.value ? toServerDate(event.target.value) : '';
                    onDateRangeChange(filters.startDate, serverDate);
                    onFiltersChange?.();
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 items-end">
                  <Input
                    type="datetime-local"
                    label={t('events.baseDate')}
                    value={approxBaseDate}
                    onChange={(e) => {
                      const newBaseDate = e.target.value;
                      setApproxBaseDate(newBaseDate);
                      if (!newBaseDate) {
                        setApproxVarianceDays(0);
                      }
                      applyApproximateTime(newBaseDate, !newBaseDate ? 0 : approxVarianceDays);
                    }}
                  />
                  <Input
                    type="number"
                    label={t('events.varianceDays')}
                    value={String(approxVarianceDays)}
                    onChange={(e) => {
                      const newVariance = Number(e.target.value);
                      setApproxVarianceDays(newVariance);
                      applyApproximateTime(approxBaseDate, newVariance);
                    }}
                    min="0"
                    disabled={!approxBaseDate}
                  />
                </div>
              </div>
            )}
          </div>

          <details className="group border border-white/5 rounded-2xl overflow-hidden bg-dn-surface">
            <summary className="flex items-center justify-between p-4 cursor-pointer marker:hidden list-none font-medium text-sm text-dn-text-main group-open:border-b group-open:border-white/5">
              {t('events.amountRange')}
              <Icon name="keyboard_arrow_down" className="text-xl text-dn-text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="p-4 grid grid-cols-2 gap-3">
              <Input
                type="number"
                label={t('events.minAmount')}
                value={filters.minAmount !== undefined ? String(filters.minAmount) : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onMinAmountChange(v === '' ? undefined : Number(v));
                  onFiltersChange?.();
                }}
                min="0"
              />
              <Input
                type="number"
                label={t('events.maxAmount')}
                value={filters.maxAmount !== undefined ? String(filters.maxAmount) : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onMaxAmountChange(v === '' ? undefined : Number(v));
                  onFiltersChange?.();
                }}
                min="0"
              />
            </div>
          </details>

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
                    onFiltersChange?.();
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
                    onFiltersChange?.();
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
                <NodeSelector
                  nodes={nodes}
                  value={filters.nodeId}
                  onChange={(id) => {
                    onNodeIdChange(id);
                    onFiltersChange?.();
                  }}
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
        {searchTrailing}
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
            <span className="px-2.5 py-1 rounded-pill text-xs font-medium bg-dn-primary/20 border border-dn-primary/30 text-dn-primary flex items-center gap-1.5">
              <Icon name="category" className="text-sm" />
              {categories
                .filter((c) => filters.categoryIds.includes(c.id))
                .map((c) => c.name)
                .join(', ')}
            </span>
          )}
          {filters.tagIds.length > 0 && (
            <span className="px-2.5 py-1 rounded-pill text-xs font-medium bg-dn-primary/20 border border-dn-primary/30 text-dn-primary flex items-center gap-1.5">
              <Icon name="sell" className="text-sm" />
              {tags
                .filter((t) => filters.tagIds.includes(t.id))
                .map((t) => t.name)
                .join(', ')}
            </span>
          )}
          {hasActiveDateRange && (
            <span className="px-2.5 py-1 rounded-pill text-xs font-medium bg-dn-primary/20 border border-dn-primary/30 text-dn-primary flex items-center gap-1.5">
              <Icon name="event" className="text-sm" />
              {filters.startDate ? formatIsoDate(fromServerDate(filters.startDate), withTime(getDateFormat())) : '...'} - {filters.endDate ? formatIsoDate(fromServerDate(filters.endDate), withTime(getDateFormat())) : '...'}
            </span>
          )}
          {hasActiveNode && (
            <span className="px-2.5 py-1 rounded-pill text-xs font-medium bg-dn-primary/20 border border-dn-primary/30 text-dn-primary flex items-center gap-1.5">
              <Icon name="account_balance_wallet" className="text-sm" />
              {nodes.find((n) => n.id === filters.nodeId)?.name || t('events.filterNode')}
            </span>
          )}
          {hasActiveAmountRange && (
            <span className="px-2.5 py-1 rounded-pill text-xs font-medium bg-dn-primary/20 border border-dn-primary/30 text-dn-primary flex items-center gap-1.5">
              <Icon name="payments" className="text-sm" />
              {filters.minAmount !== undefined ? `${filters.minAmount}` : '0'} - {filters.maxAmount !== undefined ? `${filters.maxAmount}` : '∞'}
            </span>
          )}
        </div>
      )}

      {pillsPosition === 'inline' && pillsToRender && pillsToRender.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <PillButtons pills={pillsToRender} activePill={activePill} onPillChange={onPillChange} />
        </div>
      )}

      {children}
    </>
  );
});
