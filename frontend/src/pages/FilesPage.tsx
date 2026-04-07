import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFiles, useDeleteFile } from '@/hooks/useFiles';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { filesService } from '@/services/files.service';
import type { FileWithEventDto } from '@/models';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'videocam';
  if (mimeType === 'application/pdf') return 'picture_as_pdf';
  if (mimeType.startsWith('audio/')) return 'audio_file';
  return 'description';
}

type SortDir = 'asc' | 'desc';
type FilterMode = 'all' | 'orphan' | 'linked';

interface FileCardProps {
  file: FileWithEventDto;
  onDelete: (id: number) => void;
  deleting: boolean;
}

function FileCard({ file, onDelete, deleting }: FileCardProps) {
  const { t } = useTranslation();
  const eventTypeColors: Record<string, string> = {
    INBOUND: 'income',
    OUTBOUND: 'expense',
    OTHER: 'neutral',
  } as const;

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-dn-surface-low text-dn-text-muted shrink-0">
          <Icon name={getFileIcon(file.mimeType)} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-dn-text-main truncate max-w-[200px]">
              {file.fileName}
            </span>
            {file.isOrphan && (
              <Badge variant="expense" size="sm" title={t('files.orphanHint')}>
                <Icon name="link_off" className="text-[10px] mr-0.5" />
                {t('files.orphan')}
              </Badge>
            )}
          </div>

          <p className="text-xs text-dn-text-muted">
            {formatSize(file.size)}
            <span className="mx-1.5 opacity-40">·</span>
            <span className="opacity-60">{file.mimeType}</span>
          </p>

          {/* Associated events */}
          {file.events && file.events.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {file.events.map((ev) => (
                <Link
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-dn-surface-low hover:bg-dn-surface text-xs text-dn-text-muted hover:text-dn-text-main transition-colors border border-white/5"
                >
                  <Badge
                    variant={eventTypeColors[ev.type] as 'income' | 'expense' | 'neutral'}
                    size="sm"
                    className="w-1.5 h-1.5 p-0 rounded-full"
                  />
                  <span className="truncate max-w-[120px]">{ev.name}</span>
                </Link>
              ))}
            </div>
          ) : (
            !file.isOrphan && (
              <p className="text-xs text-dn-text-muted/50">{t('files.noAssociatedEvents')}</p>
            )
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={filesService.getContentUrl(file.id)}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors"
            title={t('common.view')}
          >
            <Icon name="open_in_new" className="text-base" />
          </a>
          {file.isOrphan && (
            <button
              onClick={() => onDelete(file.id)}
              disabled={deleting}
              className="p-1.5 rounded-lg text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
              title={t('common.delete')}
            >
              <Icon name="delete" className="text-base" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

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
        back
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
