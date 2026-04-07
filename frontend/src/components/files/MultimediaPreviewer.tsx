import { useState, useEffect } from 'react';
import { FileService } from '@/services/FileService';
import { Icon } from '@/components/ui/Icon';
import type { FileDto } from '@/models';

interface MultimediaPreviewerProps {
  fileId: number;
  fileName?: string;
  onClose: () => void;
}

export function MultimediaPreviewer({ fileId, fileName, onClose }: MultimediaPreviewerProps) {
  const [fileDetails, setFileDetails] = useState<FileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    FileService.getById(fileId)
      .then(setFileDetails)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fileId]);

  const contentUrl = FileService.getContentUrl(fileId);

  let content = null;
  const isImage = fileDetails?.mimeType.startsWith('image/');
  
  if (loading) {
    content = (
      <div className="flex justify-center items-center h-full w-full">
        <Icon name="sync" className="animate-spin text-white/50 text-4xl" />
      </div>
    );
  } else if (error || !fileDetails) {
    content = (
      <div className="flex flex-col justify-center items-center h-full w-full text-dn-error gap-2 bg-dn-surface/50 rounded-xl max-w-sm mx-auto p-8 border border-dn-error/20">
        <Icon name="error_outline" className="text-4xl" />
        <p>Failed to load preview.</p>
      </div>
    );
  } else {
    const mimeType = fileDetails.mimeType;
    if (isImage) {
      content = (
        <div className={`overflow-auto w-full h-full ${zoom === 1 ? 'flex items-center justify-center p-4' : 'p-8'}`}>
          <img 
            src={contentUrl} 
            alt={fileDetails.fileName}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: zoom === 1 ? 'center' : 'top left',
              transition: 'transform 0.15s ease-out',
              maxWidth: zoom === 1 ? '100%' : 'none',
              maxHeight: zoom === 1 ? '100%' : 'none',
              objectFit: 'contain'
            }}
          />
        </div>
      );
    } else if (mimeType.startsWith('video/')) {
      content = (
        <div className="flex justify-center items-center w-full h-full p-4">
          <video src={contentUrl} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      );
    } else if (mimeType.startsWith('audio/')) {
      content = (
        <div className="flex justify-center items-center w-full h-full p-4">
          <div className="w-full max-w-md bg-dn-surface/80 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-6">
             <Icon name="audio_file" className="text-6xl text-dn-secondary" />
             <audio src={contentUrl} controls autoPlay className="w-full" />
          </div>
        </div>
      );
    } else if (mimeType === 'application/pdf') {
      content = (
        <div className="w-full h-full p-2 md:p-8">
          <iframe src={contentUrl} title={fileDetails.fileName} className="w-full h-full border-0 rounded-xl bg-white" />
        </div>
      );
    } else {
      // unsupported preview, provide download link
      content = (
        <div className="flex justify-center items-center w-full h-full p-4">
          <div className="flex flex-col items-center justify-center p-12 text-white/70 gap-4 bg-dn-surface/80 backdrop-blur-md border border-white/10 rounded-2xl max-w-sm text-center shadow-2xl">
            <Icon name="insert_drive_file" className="text-6xl text-white/50" />
            <p className="text-lg">Preview not available for this file type.</p>
            <a download={fileDetails.fileName} href={contentUrl} target="_blank" rel="noreferrer" className="text-white hover:bg-white/10 px-5 py-2.5 border border-white/20 rounded-button transition-colors font-medium flex items-center gap-2 mt-2">
              <Icon name="download" /> Download File
            </a>
          </div>
        </div>
      );
    }
  }

  const title = fileName || fileDetails?.fileName || 'Preview';

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-black/95 backdrop-blur-xl">
       {/* Header */}
       <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 shrink-0">
          <h2 className="text-sm font-medium text-white truncate pr-4 max-w-[50%] md:max-w-[70%]" title={title}>
            {title}
          </h2>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
             {/* Zoom Controls for images */}
             {isImage && (
               <div className="flex items-center bg-white/5 rounded-pill px-1 mr-2 border border-white/5">
                 <button onClick={() => setZoom(z => Math.max(1, z - 0.25))} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                    <Icon name="zoom_out" className="text-[20px]" />
                 </button>
                 <span className="text-xs text-white/70 min-w-[36px] text-center font-mono font-medium">
                   {Math.round(zoom * 100)}%
                 </span>
                 <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                    <Icon name="zoom_in" className="text-[20px]" />
                 </button>
               </div>
             )}
             
             {/* Download */}
             <a href={contentUrl} download={title} target="_blank" rel="noreferrer" className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Download">
                <Icon name="download" className="text-[22px]" />
             </a>
             
             <div className="w-px h-5 bg-white/20 mx-1" />

             {/* Close */}
             <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Close (Esc)">
                <Icon name="close" className="text-[22px]" />
             </button>
          </div>
       </div>

       {/* Viewport */}
       <div className="flex-1 w-full h-full relative overflow-hidden">
         {content}
       </div>
    </div>
  );
}
