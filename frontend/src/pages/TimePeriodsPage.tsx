import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  useTimePeriods,
  useCreateTimePeriod,
  useUpdateTimePeriod,
  useDeleteTimePeriod,
} from '@/hooks/useTimePeriods';
import { useCategories } from '@/hooks/useCategories';
import { useDefaultTimePeriod } from '@/hooks/useDefaultTimePeriod';
import { TimePeriodCard } from '@/components/time-periods/TimePeriodCard';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import type { TimePeriod, CreateTimePeriodDto } from '@/models';

// ─── types ────────────────────────────────────────────────────────────────────

interface FormValues {
  name: string;
  startDate: string;
  endDate: string;
  budgets: { categoryId: string; budgetedAmount: string }[];
  savingsPercentageGoal: string;
  budgetLimit: string;
}

type FilterTab = 'all' | 'active' | 'past' | 'future';
type SortField = 'startDate' | 'endDate' | 'name';
type SortDir = 'asc' | 'desc';

// ─── helpers ──────────────────────────────────────────────────────────────────

import { getLocalizedTodayString } from '@/lib/format';

function getPeriodStatus(tp: TimePeriod): FilterTab {
  const t = getLocalizedTodayString();
  if (tp.endDate < t) return 'past';
  if (tp.startDate > t) return 'future';
  return 'active';
}

// ─── component ────────────────────────────────────────────────────────────────

export function TimePeriodsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const { data: paged, isLoading, error } = useTimePeriods(page);
  const { data: categoriesPaged } = useCategories(0, 500);
  const createPeriod = useCreateTimePeriod();
  const updatePeriod = useUpdateTimePeriod();
  const deletePeriod = useDeleteTimePeriod();
  const { defaultId, setDefaultId } = useDefaultTimePeriod();

  const allPeriods = useMemo(() => paged?.content ?? [], [paged]);
  const totalPages = paged?.totalPages ?? 1;

  const [editTarget, setEditTarget] = useState<TimePeriod | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<TimePeriod | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', startDate: '', endDate: '', budgets: [], savingsPercentageGoal: '', budgetLimit: '' },
  });

  const { fields: budgetFields, append: appendBudget, remove: removeBudget } = useFieldArray({
    control,
    name: 'budgets',
  });

  const displayed = useMemo(() => {
    let list = allPeriods;

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((tp) => tp.name.toLowerCase().includes(q));
    }

    // Filter by status
    if (filter !== 'all') {
      list = list.filter((tp) => getPeriodStatus(tp) === filter);
    }

    // Sort
    list = [...list].sort((a, b) => {
      let va = '';
      let vb = '';
      if (sortField === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortField === 'endDate') { va = a.endDate; vb = b.endDate; }
      else { va = a.startDate; vb = b.startDate; }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allPeriods, search, filter, sortField, sortDir]);

  // ─── handlers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    reset({ name: '', startDate: '', endDate: '', budgets: [], savingsPercentageGoal: '', budgetLimit: '' });
    setShowModal(true);
  };

  const openEdit = (tp: TimePeriod) => {
    setEditTarget(tp);
    setValue('name', tp.name);
    setValue('startDate', tp.startDate);
    setValue('endDate', tp.endDate);
    setValue('budgets', tp.budgets?.map(b => ({
      categoryId: b.category ? String(b.category.id) : '',
      budgetedAmount: String(b.budgetedAmount)
    })) || []);
    setValue('savingsPercentageGoal', tp.savingsPercentageGoal != null ? String(tp.savingsPercentageGoal) : '');
    setValue('budgetLimit', tp.budgetLimit != null ? String(tp.budgetLimit) : '');
    setShowModal(true);
  };

  const onSubmit = async (values: FormValues) => {
    const dto = {
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      budgets: values.budgets?.map(b => ({
        category: { id: parseInt(b.categoryId, 10) },
        budgetedAmount: parseFloat(b.budgetedAmount)
      })),
      savingsPercentageGoal: values.savingsPercentageGoal
        ? parseFloat(values.savingsPercentageGoal)
        : undefined,
      budgetLimit: values.budgetLimit
        ? parseFloat(values.budgetLimit)
        : undefined,
    };
    if (editTarget) {
      await updatePeriod.mutateAsync({ id: editTarget.id, dto: dto as unknown as Partial<CreateTimePeriodDto> });
    } else {
      await createPeriod.mutateAsync(dto as unknown as CreateTimePeriodDto); // Ignoring strict CreateTimePeriodDto to pass budgets
    }
    reset();
    setShowModal(false);
  };

  const handleDelete = (tp: TimePeriod) => {
    setConfirmDeleteTarget(tp);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteTarget) return;
    if (defaultId === confirmDeleteTarget.id) setDefaultId(null);
    await deletePeriod.mutateAsync(confirmDeleteTarget.id);
    setConfirmDeleteTarget(null);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const isSubmitting = createPeriod.isPending || updatePeriod.isPending;

  // ─── render ─────────────────────────────────────────────────────────────────

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'active', label: t('periods.active') },
    { key: 'future', label: t('periods.future') },
    { key: 'past', label: t('periods.past') },
  ];

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'startDate', label: t('periods.start') },
    { field: 'endDate', label: t('periods.end') },
    { field: 'name', label: t('common.name') },
  ];

  return (
    <div className="space-y-4 pb-24">
      <ConfirmModal
        open={confirmDeleteTarget !== null}
        onClose={() => setConfirmDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={confirmDeleteTarget ? t('common.confirmDeleteNamed', { name: confirmDeleteTarget.name }) : ''}
        confirmLabel={t('common.delete')}
        loading={deletePeriod.isPending}
      />

      <PageHeader
        title={t('periods.title')}
        subtitle={t(paged?.totalElements !== 1 ? 'periods.count_plural' : 'periods.count', { count: paged?.totalElements ?? 0 })}
        action={
          <Button size="sm" onClick={openCreate}>
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </Button>
        }
      />

      {/* Info banner */}
      <div className="px-5">
        <div className="flex items-start gap-3 bg-dn-primary/5 border border-dn-primary/20 rounded-card px-4 py-3">
          <Icon name="info" className="text-dn-primary shrink-0 mt-0.5 text-base" />
          <p className="text-xs text-dn-text-muted leading-relaxed">
            {t('periods.infoBanner')}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-5">
        <div className="flex items-center gap-2 bg-dn-surface-low rounded-input px-4 py-2.5">
          <Icon name="search" className="text-dn-text-muted text-[18px] shrink-0" />
          <input
            type="text"
            placeholder={t('periods.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-dn-text-main placeholder-dn-text-muted/50 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-dn-text-muted hover:text-dn-text-main">
              <Icon name="close" className="text-[16px]" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Sort */}
      <div className="px-5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 px-3 py-1 rounded-pill text-xs font-medium transition-colors ${filter === key
                  ? 'bg-dn-primary/20 text-dn-primary'
                  : 'bg-dn-surface-low text-dn-text-muted hover:text-dn-text-main'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 pb-1 md:pb-0">
          <span className="text-xs text-dn-text-muted">{t('common.sort')}:</span>
          <div className="flex items-center gap-1">
            {sortOptions.map(({ field, label }) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-pill text-xs font-medium transition-colors ${sortField === field
                    ? 'bg-dn-surface text-dn-text-main'
                    : 'text-dn-text-muted hover:text-dn-text-main'
                  }`}
              >
                {label}
                {sortField === field && (
                  <Icon
                    name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    className="text-[14px]! leading-none text-dn-text-main"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {allPeriods.length === 0 ? (
        <EmptyState
          icon={<Icon name="calendar_month" className="text-2xl" />}
          title={t('periods.noPeriods')}
          description={t('periods.noPeriodsDesc')}
          action={
            <Button size="sm" onClick={openCreate}>
              <Icon name="add" className="text-sm" />
              {t('periods.createPeriod')}
            </Button>
          }
        />
      ) : displayed.length === 0 ? (
        <div className="px-5">
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Icon name="search_off" className="text-dn-text-muted text-3xl" />
            <p className="text-sm text-dn-text-muted">{t('periods.noMatch')}</p>
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              className="text-xs text-dn-primary underline"
            >
              {t('common.clearFilters')}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 space-y-3">
          {displayed.map((tp) => (
            <TimePeriodCard
              key={tp.id}
              period={tp}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title={editTarget ? t('periods.editPeriod') : t('periods.newPeriod')}
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editTarget ? t('common.update') : t('common.create')}
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label={t('common.name')}
            placeholder={t('periods.namePlaceholder')}
            error={errors.name?.message}
            {...register('name', { required: t('common.nameRequired') })}
          />
          <Input
            label={t('periods.startDate')}
            type="date"
            error={errors.startDate?.message}
            {...register('startDate', { required: t('periods.startDateRequired') })}
          />
          <Input
            label={t('periods.endDate')}
            type="date"
            error={errors.endDate?.message}
            {...register('endDate', { required: t('periods.endDateRequired') })}
          />

          <div className="space-y-2 border-t border-white/10 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-dn-text-main">{t('periods.budgetsTitle', 'Budgets')}</label>
              <button
                type="button"
                onClick={() => appendBudget({ categoryId: '', budgetedAmount: '' })}
                className="text-xs text-dn-primary flex items-center gap-1"
              >
                <Icon name="add" className="text-sm" /> {t('common.add', 'Add')}
              </button>
            </div>
            {budgetFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Select
                    {...register(`budgets.${index}.categoryId` as const, { required: true })}
                    options={[
                      { value: '', label: t('common.selectCategory', 'Select Category') },
                      ...(categoriesPaged?.content.map(c => ({ value: String(c.id), label: c.name })) || [])
                    ]}
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    {...register(`budgets.${index}.budgetedAmount` as const, { required: true })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeBudget(index)}
                  className="p-2 text-dn-text-muted hover:text-dn-error mt-6"
                >
                  <Icon name="close" className="text-sm" />
                </button>
              </div>
            ))}
          </div>

          <Input
            label={t('periods.savingsGoal')}
            type="number"
            placeholder={t('periods.savingsGoalPlaceholder')}
            min="0"
            max="100"
            step="1"
            {...register('savingsPercentageGoal')}
          />

          <Input
            label={t('periods.budgetLimit')}
            type="number"
            placeholder={t('periods.budgetLimitPlaceholder')}
            min="0"
            step="0.01"
            {...register('budgetLimit')}
          />
        </form>
      </Modal>
    </div>
  );
}
