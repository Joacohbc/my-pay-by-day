import React, { useMemo, useState } from 'react';
import { normalizeText } from '@/lib/utils/textUtils';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useFiles, useUploadFile } from '@/hooks/useFiles';
import { FileCard } from '@/components/files/FileCard';
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
  const { data: paged, isLoading } = useFiles(0, 200);

  const files = useMemo(() => {
    let result = paged?.content ?? [];
    result = result.filter((f) => !excludeIds.includes(f.id));
    if (search.trim()) {
      const q = normalizeText(search);
      result = result.filter((f) => normalizeText(f.fileName).includes(q));
    }
    return result;
  }, [paged, search, excludeIds]);

  return (
    <Modal open={open} onClose={onClose} title={t('files.title')}>
      <div className="space-y-3">
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
            className="w-full bg-dn-surface-low border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-dn-text-main placeholder:text-dn-text-muted focus:outline-none focus:ring-1 focus:ring-dn-primary/50"
          />
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
}

export function FileUploader({ files, onAddFile, onAddFiles, onRemoveFile, onRemoveFiles, accept, onAudioFile }: FileUploaderProps) {
  const { t } = useTranslation();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const isPending = isUploading || isTranscribing;
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
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
          mimeType: file.type,
          base64Content,
        });
        uploadedFiles.push(uploadedFile);
      } catch (error) {
        console.error('File upload failed:', error);
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

    if (fileInputRef.current) fileInputRef.current.value = '';
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

      <div className="space-y-3">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onDelete={() => onRemoveFile(file.id)}
            hideEventLinks
            selectionMode={selectMode}
            checked={selectedIds.has(file.id)}
            onToggleChecked={toggleSelected}
          />
        ))}

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
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 rounded-input text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50"
            >
              <Icon name={isPending ? 'pending' : 'upload'} className={isPending ? 'animate-spin' : ''} />
              <span className="text-sm font-medium">{isPending ? t('common.loading') : t('eventForm.uploadFile')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectorOpen(true)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 rounded-input text-dn-text-muted hover:text-dn-primary hover:border-dn-primary/50 hover:bg-dn-primary/5 transition-all disabled:opacity-50"
            >
              <Icon name="folder_open" />
              <span className="text-sm font-medium">{t('eventForm.selectExistingFile')}</span>
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
      </div>
    </div>
  );
}
