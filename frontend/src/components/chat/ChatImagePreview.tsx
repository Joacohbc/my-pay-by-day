import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { FileDto } from '@/models';
import { getFileIcon } from '@/lib/fileUtils';

interface ChatImagePreviewProps {
  images: FileDto[];
  previewUrls: string[];
  onRemove: (index: number) => void;
}

export function ChatImagePreview({ images, previewUrls, onRemove }: ChatImagePreviewProps) {
  const { t } = useTranslation();

  if (images.length === 0) return null;

  return (
    <div className="px-4 pt-2 border-t border-dn-border bg-dn-surface-low">
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {images.map((file, idx) => {
          const isImage = (file.mimeType || '').startsWith('image/');
          return (
            <div key={idx} className="relative shrink-0 flex items-center gap-2 bg-dn-surface rounded-lg p-1.5 border border-dn-border">
              {isImage ? (
                <img
                  src={previewUrls[idx]}
                  alt={t('chat.imageUploaded')}
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-dn-surface-low flex items-center justify-center text-dn-text-muted shrink-0 border border-white/5">
                  <Icon name={getFileIcon(file.mimeType)} className="text-[24px]" />
                </div>
              )}
              <div className="min-w-0 max-w-[120px]">
                <p className="text-[10px] text-dn-text-main/70 truncate">{file.fileName}</p>
                <p className="text-[10px] text-dn-text-main/40">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                onClick={() => onRemove(idx)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-dn-surface-low transition-colors text-dn-text-main/50 hover:text-dn-text-main ml-1"
                aria-label={t('common.close')}
              >
                <Icon name="close" className="text-[14px]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
