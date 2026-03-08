import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  useTimePeriods,
  useCreateTimePeriod,
  useUpdateTimePeriod,
  useDeleteTimePeriod,
} from '@/hooks/useTimePeriods';
import { useDefaultTimePeriod } from '@/hooks/useDefaultTimePeriod';
import { TimePeriodCard } from '@/components/time-periods/TimePeriodCard';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import type { TimePeriod } from '@/models';

// ─── types ────────────────────────────────────────────────────────────────────

interface FormValues {
  name: string;
  startDate: string;
  endDate: string;
  budgetedAmount: string;
  savingsPercentageGoal: string;
}

type FilterTab = 'all' | 'active' | 'past' | 'future';
type SortField = 'startDate' | 'endDate' | 'name';
type SortDir = 'asc' | 'desc';

// ─── helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

function getPeriodStatus(tp: TimePeriod): FilterTab {
  const t = today();
  if (tp.endDate < t) return 'past';
  if (tp.startDate > t) return 'future';
  return 'active';
}

// ─── component ────────────────────────────────────────────────────────────────

export function TimePeriodsPage() {
  const { data: periods, isLoading, error } = useTimePeriods();
  const createPeriod = useCreateTimePeriod();
  const updatePeriod = useUpdateTimePeriod();
  const deletePeriod = useDeleteTimePeriod();
  const { defaultId, setDefaultId } = useDefaultTimePeriod();

  const [editTarget, setEditTarget] = useState<TimePeriod | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', startDate: '', endDate: '', budgetedAmount: '', savingsPercentageGoal: '' },
  });

  const allPeriods = useMemo(() => periods ?? [], [periods]);

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
    reset({ name: '', startDate: '', endDate: '', budgetedAmount: '', savingsPercentageGoal: '' });
    setShowModal(true);
  };

  const openEdit = (tp: TimePeriod) => {
    setEditTarget(tp);
    setValue('name', tp.name);
    setValue('startDate', tp.startDate);
    setValue('endDate', tp.endDate);
    setValue('budgetedAmount', tp.budgetedAmount != null ? String(tp.budgetedAmount) : '');
    setValue('savingsPercentageGoal', tp.savingsPercentageGoal != null ? String(tp.savingsPercentageGoal) : '');
    setShowModal(true);
  };

  const onSubmit = async (values: FormValues) => {
    const dto = {
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      budgetedAmount: values.budgetedAmount ? parseFloat(values.budgetedAmount) : undefined,
      savingsPercentageGoal: values.savingsPercentageGoal
        ? parseFloat(values.savingsPercentageGoal)
        : undefined,
    };
    if (editTarget) {
      await updatePeriod.mutateAsync({ id: editTarget.id, dto });
    } else {
      await createPeriod.mutateAsync(dto);
    }
    reset();
    setShowModal(false);
  };

  const handleDelete = async (tp: TimePeriod) => {
    if (!confirm(`Delete "${tp.name}"?`)) return;
    if (defaultId === tp.id) setDefaultId(null);
    await deletePeriod.mutateAsync(tp.id);
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
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'future', label: 'Future' },
    { key: 'past', label: 'Past' },
  ];

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'startDate', label: 'Start' },
    { field: 'endDate', label: 'End' },
    { field: 'name', label: 'Name' },
  ];

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Time Periods"
        subtitle={`${allPeriods.length} period${allPeriods.length !== 1 ? 's' : ''}`}
        action={
          <Button size="sm" onClick={openCreate}>
            <Icon name="add" className="text-sm" />
            New
          </Button>
        }
      />

      {/* Info banner */}
      <div className="px-5">
        <div className="flex items-start gap-3 bg-dn-primary/5 border border-dn-primary/20 rounded-card px-4 py-3">
          <Icon name="info" className="text-dn-primary shrink-0 mt-0.5 text-base" />
          <p className="text-xs text-dn-text-muted leading-relaxed">
            Star a period to set it as your <span className="text-dn-text-main font-medium">Home</span> default.
            Income &amp; expense totals load in the background.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-5">
        <div className="flex items-center gap-2 bg-dn-surface-low rounded-input px-4 py-2.5">
          <Icon name="search" className="text-dn-text-muted text-[18px] shrink-0" />
          <input
            type="text"
            placeholder="Search periods…"
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

      {/* Filter tabs */}
      <div className="px-5 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 px-3 py-1 rounded-pill text-xs font-medium transition-colors ${
              filter === key
                ? 'bg-dn-primary/20 text-dn-primary'
                : 'bg-dn-surface-low text-dn-text-muted hover:text-dn-text-main'
            }`}
          >
            {label}
          </button>
        ))}

        {/* Sort controls (right-aligned) */}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <span className="text-xs text-dn-text-muted">Sort:</span>
          {sortOptions.map(({ field, label }) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-pill text-xs font-medium transition-colors ${
                sortField === field
                  ? 'bg-dn-surface text-dn-text-main'
                  : 'text-dn-text-muted hover:text-dn-text-main'
              }`}
            >
              {label}
              {sortField === field && (
                <Icon
                  name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  className="text-[12px]"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {allPeriods.length === 0 ? (
        <EmptyState
          icon={<Icon name="calendar_month" className="text-2xl" />}
          title="No time periods yet"
          description="Create budget windows to track income, spending, and savings goals"
          action={
            <Button size="sm" onClick={openCreate}>
              <Icon name="add" className="text-sm" />
              Create Period
            </Button>
          }
        />
      ) : displayed.length === 0 ? (
        <div className="px-5">
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Icon name="search_off" className="text-dn-text-muted text-3xl" />
            <p className="text-sm text-dn-text-muted">No periods match your search or filter.</p>
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              className="text-xs text-dn-primary underline"
            >
              Clear filters
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

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title={editTarget ? 'Edit Time Period' : 'New Time Period'}
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editTarget ? 'Update' : 'Create'}
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. March 2026, Q1 Budget"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Start Date"
            type="date"
            error={errors.startDate?.message}
            {...register('startDate', { required: 'Start date is required' })}
          />
          <Input
            label="End Date"
            type="date"
            error={errors.endDate?.message}
            {...register('endDate', { required: 'End date is required' })}
          />
          <Input
            label="Budget Limit (optional)"
            type="number"
            placeholder="e.g. 3000"
            min="0"
            step="0.01"
            {...register('budgetedAmount')}
          />
          <Input
            label="Savings Goal % (optional)"
            type="number"
            placeholder="e.g. 20"
            min="0"
            max="100"
            step="1"
            {...register('savingsPercentageGoal')}
          />
        </form>
      </Modal>
    </div>
  );
}
