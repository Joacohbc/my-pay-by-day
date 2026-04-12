import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { TagForm } from '@/components/tags/TagForm';
import { Icon } from '@/components/ui/Icon';
import type { Tag } from '@/models';

interface TagSelectorProps {
  tags: Tag[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  className?: string;
  showAdd?: boolean;
}

export function TagSelector({
  tags,
  value,
  onChange,
  label,
  className = '',
  showAdd = false,
}: TagSelectorProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

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

        {showAdd && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 rounded-pill text-xs font-medium border border-dashed border-white/10 bg-dn-surface-low text-dn-text-muted hover:border-dn-primary/30 hover:text-dn-primary transition-all cursor-pointer flex items-center gap-1"
          >
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </button>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('tags.newTag')}
      >
        <TagForm
          onSuccess={(newTag) => {
            onChange([...(value ?? []), String(newTag.id)]);
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}

