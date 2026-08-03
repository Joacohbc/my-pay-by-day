import { useMemo, useState, useRef } from 'react';
import { normalizeText } from '@/lib/utils/textUtils';
import { getFileTypeLabel } from '@/lib/fileUtils';
import { Routes } from '@/lib/routes';
import { useTranslation } from 'react-i18next';
import { useFiles, useDeleteFile, useUploadFile } from '@/hooks/useFiles';
import { useAlert } from '@/contexts/AlertContext';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { FileCard } from '@/components/files/FileCard';
import { CreateEmailModal } from '@/components/files/CreateEmailModal';

type SortDir = 'asc' | 'desc';
type FilterMode = 'all' | 'orphan' | 'linked';

export function FilesPage() {
  const { t } = useTranslation();
  const alert = useAlert();
  const [search, setSearch] = useState('');
  const [selectedMimeType, setSelectedMimeType] = useState<string>('all');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [createEmailOpen, setCreateEmailOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    for (const file of selectedFiles) {
      try {
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadFile.mutateAsync({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Content,
        });
        alert.success(t('files.uploadSuccess'));
      } catch {
        alert.error(t('common.error'));
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const orphaned = filter === 'all' ? undefined : filter === 'orphan' ? true : false;
  const { data: paged, isLoading, error } = useFiles(0, 200, orphaned);
  const deleteFile = useDeleteFile();

  const availableMimeTypes = useMemo(() => {
    const types = new Set<string>();
    (paged?.content ?? []).forEach((file) => {
      if (file.mimeType) {
        types.add(file.mimeType);
      }
    });
    return Array.from(types).sort();
  }, [paged]);

  const mimeTypeOptions = useMemo(() => {
    return [
      { value: 'all', label: t('files.allMimeTypes') },
      ...availableMimeTypes.map((mime) => ({
        value: mime,
        label: getFileTypeLabel('', mime),
      })),
    ];
  }, [availableMimeTypes, t]);

  const files = useMemo(() => {
    let result = paged?.content ?? [];
    if (selectedMimeType !== 'all') {
      result = result.filter((f) => f.mimeType === selectedMimeType);
    }
    if (search.trim()) {
      const q = normalizeText(search);
      result = result.filter((f) => normalizeText(f.fileName).includes(q));
    }
    return [...result].sort((a, b) =>
      sortDir === 'asc' ? a.size - b.size : b.size - a.size
    );
  }, [paged, selectedMimeType, search, sortDir]);

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

      <CreateEmailModal
        open={createEmailOpen}
        onClose={() => setCreateEmailOpen(false)}
      />

      <PageHeader
        title={t('files.title')}
        back={Routes.SETTINGS}
        subtitle={t('files.count', { count: paged?.totalElements ?? 0 })}
        action={
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadChange}
              multiple
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadFile.isPending}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Icon
                name={uploadFile.isPending ? 'pending' : 'upload_file'}
                className={`text-base ${uploadFile.isPending ? 'animate-spin' : ''}`}
              />
              <span>{uploadFile.isPending ? t('common.loading') : t('files.uploadButton')}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateEmailOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Icon name="mail" className="text-base" />
              <span>{t('files.createEmailButton')}</span>
            </Button>
          </div>
        }
      />

      {/* Controls */}
      <div className="px-5 space-y-2">
        {/* Search & MIME Type filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
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

          {availableMimeTypes.length > 0 && (
            <div className="min-w-[180px]">
              <SearchableSelect
                value={selectedMimeType}
                options={mimeTypeOptions}
                onChange={(val) => setSelectedMimeType(val ? String(val) : 'all')}
                placeholder={t('files.allMimeTypes')}
              />
            </div>
          )}
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
