import React, { useMemo, useState } from 'react';
import { normalizeText } from '@/lib/utils/textUtils';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useFiles, useUploadFile } from '@/hooks/useFiles';
import { filesService } from '@/services/files.service';
import { FileCard } from '@/components/files/FileCard';
import { CreateEmailModal } from '@/components/files/CreateEmailModal';
import { CameraModal } from '@/components/files/CameraModal';
import { getFileTypeLabel } from '@/lib/fileUtils';
import type { FileDto } from '@/models';

interface FileSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: FileDto) => void;
  excludeIds: number[];
}

function FileSelectorModal({ open, onClose, onSelect, excludeIds }: FileSelectorModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedMimeType, setSelectedMimeType] = useState<string>('all');
  const { data: paged, isLoading } = useFiles(0, 200);

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
    result = result.filter((f) => !excludeIds.includes(f.id));
    if (selectedMimeType !== 'all') {
      result = result.filter((f) => f.mimeType === selectedMimeType);
    }
    if (search.trim()) {
      const q = normalizeText(search);
      result = result.filter((f) => normalizeText(f.fileName).includes(q));
    }
    return result;
  }, [paged, search, selectedMimeType, excludeIds]);

  return (
    <Modal open={open} onClose={onClose} title={t('files.title')}>
      <div className="space-y-3">
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
              className="w-full bg-dn-surface-low border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-dn-text-main placeholder:text-dn-text-muted focus:outline-none focus:ring-1 focus:ring-dn-primary/50"
            />
          </div>

          {availableMimeTypes.length > 0 && (
            <div className="min-w-[160px]">
              <SearchableSelect
                value={selectedMimeType}
                options={mimeTypeOptions}
                onChange={(val) => setSelectedMimeType(val ? String(val) : 'all')}
                placeholder={t('files.allMimeTypes')}
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-dn-text-muted text-center py-4">{t('common.loading')}</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-dn-text-muted text-center py-4">{t('common.noResults')}</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onSelect={() => onSelect(file)}
                hideEventLinks
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export interface FileUploaderProps {
  files: FileDto[];
  onAddFile: (file: FileDto) => void;
  /** Adds several files in a single call. Falls back to sequential `onAddFile` calls when omitted —
   * provide this when the caller computes the next file list from a snapshot (e.g. reads `currentIds`
   * off a closed-over object), otherwise selecting multiple files at once will each be patched against
   * the same stale snapshot and only the last one survives. */
  onAddFiles?: (files: FileDto[]) => Promise<void> | void;
  onRemoveFile: (fileId: number) => void;
  /** Removes several files in a single call. Falls back to sequential `onRemoveFile` calls when
   * omitted — provide this when the caller can batch the removal into one request. */
  onRemoveFiles?: (fileIds: number[]) => Promise<void> | void;
  /** Restricts the OS file picker to specific types. Omit to allow any file — the backend has no
   * MIME type allowlist: images/audio/video preview natively and every other type is converted to
   * Markdown on a best-effort basis. */
  accept?: string;
  onAudioFile?: (file: File) => Promise<void>;
  /** Visual variant: 'full' (default) shows large buttons with text labels; 'compact' shows small icon-only buttons. */
  variant?: 'full' | 'compact';
  /** Alternative shorthand boolean prop for compact mode. */
  compact?: boolean;
}

export function FileUploader({
  files,
  onAddFile,
  onAddFiles,
  onRemoveFile,
  onRemoveFiles,
  accept,
  onAudioFile,
  variant = 'full',
  compact,
}: FileUploaderProps) {
  const { t } = useTranslation();
  const isCompactMode = variant === 'compact' || compact;
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const isPending = isUploading || isTranscribing;
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [createEmailOpen, setCreateEmailOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleEmailCreated = async (fileId: number) => {
    try {
      const file = await filesService.getById(fileId);
      await onAddFile(file);
    } catch {
      // Ignore if fetch fails
    }
  };

  const toggleSelected = (fileId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
      return next;
    });
  };

  const handleRemoveSelected = async () => {
    const ids = Array.from(selectedIds);
    setIsRemoving(true);
    try {
      if (onRemoveFiles) {
        await onRemoveFiles(ids);
      } else {
        await Promise.all(ids.map((id) => onRemoveFile(id)));
      }
      exitSelectMode();
    } finally {
      setIsRemoving(false);
    }
  };

  const processRawFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const uploadedFiles: FileDto[] = [];

    for (const file of selectedFiles) {
      if (onAudioFile && file.type.startsWith('audio/')) {
        setIsTranscribing(true);
        try {
          await onAudioFile(file);
        } finally {
          setIsTranscribing(false);
        }
        continue;
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);

      try {
        const base64Content = await base64Promise;
        const uploadedFile = await uploadFile({
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
          base64Content,
        });
        uploadedFiles.push(uploadedFile);
      } catch {
        continue;
      }
    }

    if (uploadedFiles.length > 0) {
      if (onAddFiles) {
        await onAddFiles(uploadedFiles);
      } else {
        for (const uploadedFile of uploadedFiles) {
          await onAddFile(uploadedFile);
        }
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    await processRawFiles(selectedFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleCameraCapture = async (file: File) => {
    await processRawFiles([file]);
  };

  return (
    <div>
      <FileSelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={(file) => { onAddFile(file); setSelectorOpen(false); }}
        excludeIds={files.map((f) => f.id)}
      />

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleRemoveSelected}
        title={t('files.removeSelected')}
        message={t('files.removeSelectedConfirm', { count: selectedIds.size })}
        confirmLabel={t('files.removeSelected')}
        variant="danger"
        loading={isRemoving}
      />

      <CreateEmailModal
        open={createEmailOpen}
        onClose={() => setCreateEmailOpen(false)}
        onCreated={handleEmailCreated}
      />

      <CameraModal
        open={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
      />

      {!isCompactMode && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">{t('eventForm.files')}</p>
          {files.length > 0 && (
            selectMode ? (
              <button type="button" onClick={exitSelectMode} className="text-xs font-medium text-dn-text-muted hover:text-dn-primary transition-colors">
                {t('common.cancel')}
              </button>
            ) : (
              <button type="button" onClick={() => setSelectMode(true)} className="text-xs font-medium text-dn-text-muted hover:text-dn-primary transition-colors">
                {t('files.select')}
              </button>
            )
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar items-center">
          {files.map((file) => (
            <div key={file.id} className="shrink-0 w-64 sm:w-72">
              <FileCard
                file={file}
                onDelete={() => onRemoveFile(file.id)}
                hideEventLinks
                selectionMode={selectMode}
                checked={selectedIds.has(file.id)}
                onToggleChecked={toggleSelected}
              />
            </div>
          ))}
        </div>
      )}

      {selectMode ? (
          <div className="flex items-center justify-between gap-2 p-3 border border-dashed border-white/20 rounded-input">
            <span className="text-sm text-dn-text-muted">{t('files.selectedCount', { count: selectedIds.size })}</span>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={selectedIds.size === 0 || isRemoving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-dn-error hover:bg-dn-error/10 rounded-button transition-colors disabled:opacity-50"
            >
              <Icon name="delete" className="text-[1.1rem]" />
              {t('files.removeSelected')}
            </button>
          </div>
        ) : isCompactMode ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCameraModalOpen(true)}
              disabled={isPending}
              title={t('files.takePhoto')}
              aria-label={t('files.takePhoto')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-dn-surface border border-white/5 text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Icon name="photo_camera" className="text-lg" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              title={t('eventForm.uploadFile')}
              aria-label={t('eventForm.uploadFile')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-dn-surface border border-white/5 text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Icon name={isPending ? 'pending' : 'upload'} className={`text-lg ${isPending ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setSelectorOpen(true)}
              disabled={isPending}
              title={t('eventForm.selectExistingFile')}
              aria-label={t('eventForm.selectExistingFile')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-dn-surface border border-white/5 text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Icon name="folder_open" className="text-lg" />
            </button>

            <button
              type="button"
              onClick={() => setCreateEmailOpen(true)}
              disabled={isPending}
              title={t('files.createEmailButton')}
              aria-label={t('files.createEmailButton')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-dn-surface border border-white/5 text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Icon name="mail" className="text-lg" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setCameraModalOpen(true)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 rounded-input text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Icon name="photo_camera" />
              <span className="text-sm font-medium">{t('files.takePhoto')}</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 rounded-input text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Icon name={isPending ? 'pending' : 'upload'} className={isPending ? 'animate-spin' : ''} />
              <span className="text-sm font-medium">{isPending ? t('common.loading') : t('eventForm.uploadFile')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectorOpen(true)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 rounded-input text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Icon name="folder_open" />
              <span className="text-sm font-medium">{t('eventForm.selectExistingFile')}</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateEmailOpen(true)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 rounded-input text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Icon name="mail" />
              <span className="text-sm font-medium">{t('files.createEmailButton')}</span>
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept={accept}
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          capture="environment"
        />
      </div>
    );
  }
