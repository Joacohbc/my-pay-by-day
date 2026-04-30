import { useMemo, useState } from 'react';
import { Routes } from '@/lib/routes';
import { useTranslation } from 'react-i18next';
import { useFiles, useDeleteFile } from '@/hooks/useFiles';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { FileCard } from '@/components/files/FileCard';

type SortDir = 'asc' | 'desc';
type FilterMode = 'all' | 'orphan' | 'linked';

export function FilesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const orphaned = filter === 'all' ? undefined : filter === 'orphan' ? true : false;
  const { data: paged, isLoading, error } = useFiles(0, 200, orphaned);
  const deleteFile = useDeleteFile();

  const files = useMemo(() => {
    let result = paged?.content ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.fileName.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) =>
      sortDir === 'asc' ? a.size - b.size : b.size - a.size
    );
  }, [paged, search, sortDir]);

  const orphanCount = useMemo(
    () => (paged?.content ?? []).filter((f) => f.isOrphan).length,
    [paged]
  );

  const handleDelete = async () => {
    if (confirmDeleteId === null) return;
    await deleteFile.mutateAsync(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const filterOptions: { value: FilterMode; label: string }[] = [
    { value: 'all', label: t('files.all') },
    { value: 'orphan', label: t('files.orphansOnly') },
    { value: 'linked', label: t('files.linkedOnly') },
  ];

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        message={t('files.deleteConfirm')}
        confirmLabel={t('common.delete')}
        loading={deleteFile.isPending}
      />

      <PageHeader
        title={t('files.title')}
        back={Routes.SETTINGS}
        subtitle={t('files.count', { count: paged?.totalElements ?? 0 })}
      />

      {/* Orphan summary */}
      {orphanCount > 0 && filter === 'all' && (
        <div className="px-5">
          <button
            onClick={() => setFilter('orphan')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dn-error/10 border border-dn-error/20 text-dn-error text-xs font-medium w-full"
          >
            <Icon name="link_off" className="text-sm" />
            <span>{t('files.orphanSummary', { count: orphanCount })}</span>
            <Icon name="chevron_right" className="ml-auto text-sm" />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="px-5 space-y-2">
        {/* Search */}
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dn-text-muted text-base pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('files.searchPlaceholder')}
            className="w-full bg-dn-surface border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-dn-text-main placeholder:text-dn-text-muted focus:outline-none focus:ring-1 focus:ring-dn-primary/50"
          />
        </div>

        {/* Filter tabs + Sort */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-dn-surface-low rounded-xl p-0.5">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filter === opt.value
                    ? 'bg-dn-surface text-dn-text-main shadow-sm'
                    : 'text-dn-text-muted hover:text-dn-text-main',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dn-surface-low text-dn-text-muted hover:text-dn-text-main text-xs font-medium transition-colors"
          >
            <Icon name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-sm" />
            {t('files.sortBySize')}
          </button>
        </div>
      </div>

      {/* List */}
      {files.length === 0 ? (
        <EmptyState
          icon={<Icon name="folder_open" />}
          title={t('files.noFiles')}
          description={t('files.noFilesDesc')}
        />
      ) : (
        <div className="px-5 space-y-2">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={setConfirmDeleteId}
              deleting={deleteFile.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
