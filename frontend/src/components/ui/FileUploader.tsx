import React, { useMemo, useState } from 'react';
import { normalizeText } from '@/lib/utils/textUtils';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
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

const DEFAULT_ACCEPT = 'image/*,video/*,.pdf,.csv,.json,text/*';

export interface FileUploaderProps {
  files: FileDto[];
  onAddFile: (file: FileDto) => void;
  onRemoveFile: (fileId: number) => void;
  accept?: string;
  onAudioFile?: (file: File) => Promise<void>;
}

export function FileUploader({ files, onAddFile, onRemoveFile, accept = DEFAULT_ACCEPT, onAudioFile }: FileUploaderProps) {
  const { t } = useTranslation();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const isPending = isUploading || isTranscribing;
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

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
        onAddFile(uploadedFile);
      } catch (error) {
        console.error('File upload failed:', error);
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

      <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">{t('eventForm.files')}</p>

      <div className="space-y-3">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onDelete={() => onRemoveFile(file.id)}
            hideEventLinks
          />
        ))}

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
