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
  /** When true the list starts collapsed (default: false) */
  collapsible?: boolean;
  error?: string;
}

export function TagSelector({
  tags,
  value,
  onChange,
  label,
  className = '',
  showAdd = false,
  collapsible = false,
  error,
}: TagSelectorProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [open, setOpen] = useState(!collapsible);

  const resolvedLabel = label ?? t('eventForm.tags');

  const anySelected = value?.length > 0;

  const header = (
    <p
      className={[
        'text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2',
        collapsible ? 'flex items-center gap-1 hover:text-dn-text-main transition-colors cursor-pointer select-none' : '',
      ].join(' ')}
      onClick={collapsible ? () => setOpen((v) => !v) : undefined}
    >
      {collapsible && anySelected && (
        <span className="w-1.5 h-1.5 rounded-full bg-dn-primary inline-block mr-0.5" />
      )}
      {resolvedLabel}
      {collapsible && <Icon name={open ? 'expand_less' : 'expand_more'} className="text-sm" />}
    </p>
  );

  return (
    <div className={className}>
      {header}

      {open && (
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
      )}

      {error && <p className="mt-1 text-xs text-dn-error">{error}</p>}

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
