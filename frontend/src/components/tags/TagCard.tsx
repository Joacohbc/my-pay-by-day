import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import type { Tag, DuplicateRecord } from '@/models';
import { SimpleEntityDuplicatesSection } from '@/components/duplicates/SimpleEntityDuplicatesSection';

interface TagCardProps {
  tag: Tag;
  duplicates?: DuplicateRecord[];
  isPending?: boolean;
  onEdit: (tag: Tag) => void;
  onArchive: (tag: Tag) => void;
  onUnarchive: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
}

export function TagCard({
  tag,
  duplicates = [],
  isPending = false,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: TagCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={`${tag.archived ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${tag.color ? '' : 'bg-dn-primary/10 text-dn-primary'}`}
          style={tag.color ? { color: tag.color, backgroundColor: `${tag.color}1A` } : undefined}
        >
          <span className="text-lg font-bold">#</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-medium text-dn-text-main">{tag.name}</p>
            {tag.archived && (
              <span className="text-xs bg-dn-surface-low text-dn-text-muted px-1.5 py-0.5 rounded">
                {t('common.archived')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!tag.archived && (
            <button
              onClick={() => onEdit(tag)}
              className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
            >
              <Icon name="edit" className="text-base" />
            </button>
          )}
          {tag.archived ? (
            <button
              onClick={() => onUnarchive(tag)}
              disabled={isPending}
              className="p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors disabled:opacity-50"
            >
              <Icon name="unarchive" className="text-base" />
            </button>
          ) : (
            <button
              onClick={() => onArchive(tag)}
              disabled={isPending}
              className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors disabled:opacity-50"
            >
              <Icon name="archive" className="text-base" />
            </button>
          )}
          <button
            onClick={() => onDelete(tag)}
            disabled={isPending}
            className="p-2 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
          >
            <Icon name="delete" className="text-base" />
          </button>
        </div>
      </div>
      {tag.description && (
        <p className="text-xs text-dn-text-muted mt-2 pb-2 pr-2 pl-2 text-pretty">{tag.description}</p>
      )}
      <SimpleEntityDuplicatesSection
        records={duplicates}
        currentId={tag.id}
      />
    </Card>
  );
}
