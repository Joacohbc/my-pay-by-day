import { useState } from 'react';
import type { FileDto } from '@/models';
import { Icon } from '@/components/ui/Icon';
import { MultimediaPreviewer } from '@/components/files/MultimediaPreviewer';
import { formatFileSize } from '@/lib/format';

interface FileItemProps {
  file: FileDto;
  onClick?: () => void;
  disablePreview?: boolean;
}

export function FileItem({ file, onClick, disablePreview = false }: FileItemProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (!disablePreview) {
      setIsPreviewOpen(true);
    }
  };

  const getMimeIcon = (mime: string) => {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'movie';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime === 'application/pdf') return 'picture_as_pdf';
    return 'description';
  };

  const iconName = getMimeIcon(file.mimeType);
  const typeLabel = file.mimeType.split('/')[1]?.toUpperCase() || file.mimeType;

  return (
    <>
      <div 
        onClick={handleClick}
        className="flex items-center w-full justify-between group active:scale-[0.99] transition-transform py-1 cursor-pointer"
      >
         <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Icon */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-dn-surface text-dn-secondary shrink-0 shadow-sm border border-white/5">
               <Icon name={iconName} className="text-[24px]" />
            </div>
            
            {/* Info */}
            <div className="flex flex-col flex-1 min-w-0">
               <span className="text-base font-medium text-dn-text-main flex items-center gap-2 min-w-0">
                 <span className="truncate">{file.fileName}</span>
               </span>
               <span className="text-xs text-dn-text-muted mt-0.5">
                 {formatFileSize(file.size)} &middot; {typeLabel}
               </span>
            </div>
         </div>
         
         {!disablePreview && (
           <div className="shrink-0 pl-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
             <div className="w-8 h-8 rounded-full bg-dn-surface-low flex items-center justify-center text-dn-text-main">
               <Icon name="visibility" className="text-[18px]" />
             </div>
           </div>
         )}
      </div>
      
      {isPreviewOpen && (
        <MultimediaPreviewer
          fileId={file.id}
          fileName={file.fileName}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
}
