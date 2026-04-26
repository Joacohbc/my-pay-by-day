import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import type { TagGroup } from '@/models';

interface TagGroupCardProps {
  group: TagGroup;
  isPending?: boolean;
  onEdit: (group: TagGroup) => void;
  onArchive: (group: TagGroup) => void;
  onUnarchive: (group: TagGroup) => void;
  onDelete: (group: TagGroup) => void;
}

export function TagGroupCard({
  group,
  isPending = false,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: TagGroupCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={`group relative ${group.archived ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-dn-primary/10 text-dn-primary flex items-center justify-center shrink-0">
            <Icon name={group.icon ?? 'label'} className="text-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-dn-text-main">{group.name}</h3>
              {group.archived && (
                <span className="text-xs bg-dn-surface-low text-dn-text-muted px-1.5 py-0.5 rounded">
                  {t('common.archived')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {group.tags.map(t => (
                <span key={t.id} className="text-xs bg-dn-surface-low px-2 py-0.5 rounded-pill text-dn-text-muted border border-white/5">
                  #{t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!group.archived && (
            <button
              onClick={() => onEdit(group)}
              className="p-2 text-dn-text-muted hover:text-dn-primary transition-colors cursor-pointer"
            >
              <Icon name="edit" />
            </button>
          )}
          {group.archived ? (
            <button
              onClick={() => onUnarchive(group)}
              className="p-2 text-dn-text-muted hover:text-dn-primary transition-colors cursor-pointer"
              disabled={isPending}
            >
              <Icon name="unarchive" />
            </button>
          ) : (
            <button
              onClick={() => onArchive(group)}
              className="p-2 text-dn-text-muted hover:text-dn-text-main transition-colors cursor-pointer"
              disabled={isPending}
            >
              <Icon name="archive" />
            </button>
          )}
          <button
            onClick={() => onDelete(group)}
            className="p-2 text-dn-text-muted hover:text-dn-status-critical transition-colors cursor-pointer"
            disabled={isPending}
          >
            <Icon name="delete" />
          </button>
        </div>
      </div>
      {group.description && (
        <p className="text-xs text-dn-text-muted mt-2 pb-2 pr-2 pl-2 text-pretty">{group.description}</p>
      )}
    </Card>
  );
}
