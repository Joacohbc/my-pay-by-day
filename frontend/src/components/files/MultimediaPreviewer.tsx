import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { filesService } from '@/services/files.service';
import { extractService } from '@/services/extract.service';
import { Icon } from '@/components/ui/Icon';
import { AudioMessagePlayer } from '@/components/chat/AudioMessagePlayer';
import { isBrowserNativePreview, isMarkdownFile } from '@/lib/fileUtils';
import type { FileDto } from '@/models';

interface MultimediaPreviewerProps {
  fileId: number;
  fileName?: string;
  onClose: () => void;
}

export function MultimediaPreviewer({ fileId, fileName, onClose }: MultimediaPreviewerProps) {
  const { t } = useTranslation();
  const [fileDetails, setFileDetails] = useState<FileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [markdownLoading, setMarkdownLoading] = useState(true);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    filesService.getById(fileId)
      .then(setFileDetails)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fileId]);

  useEffect(() => {
    if (!fileDetails || isBrowserNativePreview(fileDetails.mimeType)) return;

    let cancelled = false;
    const { mimeType, fileName: name } = fileDetails;

    const loadMarkdown = async () => {
      setMarkdownLoading(true);
      try {
        if (isMarkdownFile(mimeType, name)) {
          const text = await filesService.getContentAsText(fileId);
          if (!cancelled) setMarkdown(text);
          return;
        }
        const base64 = await filesService.getContentAsBase64(fileId);
        const { markdown: converted } = await extractService.toMarkdown({ data: base64, mediaType: mimeType, filename: name });
        if (!cancelled) setMarkdown(converted);
      } catch {
        if (!cancelled) setMarkdown(null);
      } finally {
        if (!cancelled) setMarkdownLoading(false);
      }
    };

    loadMarkdown();
    return () => { cancelled = true; };
  }, [fileDetails, fileId]);

  const contentUrl = filesService.getContentUrl(fileId);

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
        <p>{t('files.preview.failed')}</p>
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
             <AudioMessagePlayer src={contentUrl} autoPlay className="w-full" />
          </div>
        </div>
      );
    } else if (mimeType === 'application/pdf') {
      content = (
        <div className="w-full h-full p-2 md:p-8">
          <iframe src={contentUrl} title={fileDetails.fileName} className="w-full h-full border-0 rounded-xl bg-white" />
        </div>
      );
    } else if (markdownLoading) {
      content = (
        <div className="flex flex-col justify-center items-center h-full w-full text-white/60 gap-3">
          <Icon name="sync" className="animate-spin text-white/50 text-4xl" />
          <p className="text-sm">{t('files.preview.converting')}</p>
        </div>
      );
    } else if (markdown !== null) {
      content = (
        <div className="w-full h-full overflow-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto bg-dn-surface/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl prose prose-sm prose-invert max-w-none prose-table:my-0 prose-p:leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ ...props }) => (
                  <div className="overflow-x-auto my-8 -mx-1 px-1">
                    <table {...props} className="min-w-full border-collapse border border-dn-border/20 rounded-xl overflow-hidden shadow-sm bg-dn-surface-low/20" />
                  </div>
                ),
                thead: ({ ...props }) => <thead {...props} className="bg-dn-surface-low/50" />,
                th: ({ ...props }) => (
                  <th {...props} className="px-5 py-3.5 text-left text-[11px] font-bold text-dn-text-main/50 uppercase tracking-widest border-b border-dn-border/30 whitespace-nowrap" />
                ),
                td: ({ ...props }) => (
                  <td {...props} className="px-5 py-3.5 text-sm text-dn-text-main/80 border-b border-dn-border/10 whitespace-nowrap" />
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      );
    } else {
      content = (
        <div className="flex justify-center items-center w-full h-full p-4">
          <div className="flex flex-col items-center justify-center p-12 text-white/70 gap-4 bg-dn-surface/80 backdrop-blur-md border border-white/10 rounded-2xl max-w-sm text-center shadow-2xl">
            <Icon name="insert_drive_file" className="text-6xl text-white/50" />
            <p className="text-lg">{t('files.preview.unavailable')}</p>
            <a download={fileDetails.fileName} href={contentUrl} target="_blank" rel="noreferrer" className="text-white hover:bg-white/10 px-5 py-2.5 border border-white/20 rounded-button transition-colors font-medium flex items-center gap-2 mt-2">
              <Icon name="download" /> {t('files.preview.download')}
            </a>
          </div>
        </div>
      );
    }
  }

  const title = fileName || fileDetails?.fileName || t('files.preview.title');

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
                 <span className="text-xs text-white/70 min-w-9 text-center font-mono font-medium">
                   {Math.round(zoom * 100)}%
                 </span>
                 <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                    <Icon name="zoom_in" className="text-[20px]" />
                 </button>
               </div>
             )}

             {/* Download */}
             <a href={contentUrl} download={title} target="_blank" rel="noreferrer" className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors" title={t('common.download')}>
                <Icon name="download" className="text-[22px]" />
             </a>

             <div className="w-px h-5 bg-white/20 mx-1" />

             {/* Close */}
             <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors" title={t('common.close')}>
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
