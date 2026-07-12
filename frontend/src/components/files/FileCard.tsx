import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { MultimediaPreviewer } from '@/components/files/MultimediaPreviewer';
import { getFileIcon, getFileTypeLabel } from '@/lib/fileUtils';

export interface FileCardProps {
  file: {
    id: number;
    fileName: string;
    mimeType: string;
    typeLabel?: string;
    size: number;
    isOrphan?: boolean;
    events?: { id: number; name: string; type: string }[];
  };
  onDelete?: (id: number) => void;
  deleting?: boolean;
  hideActions?: boolean;
  hideEventLinks?: boolean;
  onSelect?: () => void;
  selectionMode?: boolean;
  checked?: boolean;
  onToggleChecked?: (id: number) => void;
}

export function FileCard({ file, onDelete, deleting, hideActions, hideEventLinks, onSelect, selectionMode, checked, onToggleChecked }: FileCardProps) {
  const { t } = useTranslation();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const eventTypeColors: Record<string, string> = {
    INBOUND: 'income',
    OUTBOUND: 'expense',
    OTHER: 'neutral',
  } as const;

  const toggleChecked = () => onToggleChecked?.(file.id);
  const isSelectable = selectionMode || onSelect !== undefined;
  const activate = selectionMode ? toggleChecked : onSelect;
  const selectableProps = isSelectable
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: activate,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          activate?.();
        },
      }
    : {};

  return (
    <>
    <div
      {...selectableProps}
      className={`flex flex-col p-3 bg-dn-surface-low rounded-input border transition-all ${checked ? 'border-dn-primary/50 bg-dn-primary/5' : 'border-white/5'} ${isSelectable ? 'w-full text-left cursor-pointer hover:bg-dn-surface hover:border-dn-primary/30' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 bg-dn-surface rounded-md flex items-center justify-center text-dn-text-muted">
            <Icon name={getFileIcon(file.mimeType)} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-dn-text-main truncate">
                {file.fileName}
              </span>
              {file.isOrphan && (
                <span title={t('files.orphanHint')}>
                  <Badge variant="expense" size="sm" className="px-2 py-0 h-5 flex items-center gap-1">
                    <Icon name="link_off" className="text-[10px]" />
                    <span className="text-[9px] uppercase font-bold tracking-tight">{t('files.orphan')}</span>
                  </Badge>
                </span>
              )}
            </div>
            <span className="text-xs text-dn-text-muted uppercase tracking-wider mt-0.5">
              {(file.size / 1024).toFixed(1)} KB • {file.typeLabel ?? getFileTypeLabel(file.fileName, file.mimeType)}
            </span>
          </div>
        </div>

        {selectionMode ? (
          <div className="flex gap-1 shrink-0 text-dn-primary">
            <Icon name={checked ? 'check_box' : 'check_box_outline_blank'} className="text-[1.2rem]" />
          </div>
        ) : isSelectable ? (
          <div className="flex gap-1 shrink-0 text-dn-primary">
            <Icon name="add_circle" className="text-[1.2rem]" />
          </div>
        ) : !hideActions && (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="p-2 text-dn-text-muted hover:text-dn-primary transition-colors"
              title={t('common.view')}
            >
              <Icon name="visibility" className="text-[1.2rem]" />
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(file.id)}
                disabled={deleting}
                className="p-2 text-dn-text-muted hover:text-dn-error transition-colors disabled:opacity-50"
                title={t('common.delete')}
              >
                <Icon name="close" className="text-[1.2rem]" />
              </button>
            )}
          </div>
        )}
      </div>

      {hideEventLinks ? null : file.events && file.events.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-2 mt-2 border-t border-white/5">
          {file.events.map((ev) => (
            <Link
              key={ev.id}
              to={`/events/${ev.id}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-dn-surface hover:bg-dn-surface-low text-[10px] text-dn-text-muted hover:text-dn-text-main transition-colors border border-white/5"
            >
              <Badge
                variant={eventTypeColors[ev.type] as 'income' | 'expense' | 'neutral'}
                size="sm"
                className="w-1.5 h-1.5 p-0 rounded-full"
              >{''}</Badge>
              <span className="truncate max-w-[120px]">{ev.name || ev.id}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="pt-2 mt-2 border-t border-white/5">
          <span className="text-[10px] text-dn-text-muted italic flex items-center gap-1">
            <Icon name="link_off" className="text-xs opacity-50" />
            {t('files.noAssociatedEvents')}
          </span>
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

