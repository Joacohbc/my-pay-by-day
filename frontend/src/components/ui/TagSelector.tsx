import { useTranslation } from 'react-i18next';
import type { Tag } from '@/models';

interface TagSelectorProps {
  tags: Tag[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  className?: string;
}

export function TagSelector({
  tags,
  value,
  onChange,
  label,
  className = '',
}: TagSelectorProps) {
  const { t } = useTranslation();

  if (tags.length === 0) return null;

  const resolvedLabel = label ?? t('eventForm.tags');

  return (
    <div className={className}>
      <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">
        {resolvedLabel}
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = value?.includes(String(tag.id));
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                const current = value ?? [];
                if (selected) {
                  onChange(current.filter((id) => id !== String(tag.id)));
                } else {
                  onChange([...current, String(tag.id)]);
                }
              }}
              className={[
                'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer',
                selected
                  ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                  : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
              ].join(' ')}
            >
              #{tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
