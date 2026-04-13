import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { TagGroup } from '@/models';


interface TagGroupSelectorProps {
  tagGroups: TagGroup[];
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function TagGroupSelector({
  tagGroups,
  selectedTagIds,
  onChange,
  className = '',
}: TagGroupSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (tagGroups.length === 0) return null;

  const toggleGroup = (group: TagGroup) => {
    const groupTagIds = group.tags.map((tag) => String(tag.id));
    const allSelected = groupTagIds.every((id) => selectedTagIds.includes(id));

    if (allSelected) {
      onChange(selectedTagIds.filter((id) => !groupTagIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedTagIds, ...groupTagIds]));
      onChange(merged);
    }
  };

  const anyGroupActive = tagGroups.some((group) =>
    group.tags.some((tag) => selectedTagIds.includes(String(tag.id)))
  );

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2 hover:text-dn-text-main transition-colors cursor-pointer"
      >
        {anyGroupActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-dn-primary inline-block mr-0.5" />
        )}
        {t('eventForm.tagGroups')}
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-sm" />
      </button>

      {open && (
        <div className="flex flex-wrap gap-2">
          {tagGroups.map((group) => {
            const groupTagIds = group.tags.map((tag) => String(tag.id));
            const allSelected =
              groupTagIds.length > 0 &&
              groupTagIds.every((id) => selectedTagIds.includes(id));
            const someSelected =
              !allSelected && groupTagIds.some((id) => selectedTagIds.includes(id));

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGroup(group)}
                className={[
                  'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer flex items-center gap-1',
                  allSelected
                    ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                    : someSelected
                      ? 'bg-dn-primary/10 border-dn-primary/20 text-dn-primary/70'
                      : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
                ].join(' ')}
              >
                <Icon name={group.icon ?? 'label'} className="text-sm" />
                {group.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
