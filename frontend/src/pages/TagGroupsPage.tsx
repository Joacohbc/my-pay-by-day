import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTagGroups, useDeleteTagGroup } from '@/hooks/useTagGroups';
import type { TagGroup } from '@/models';
import { TagGroupForm } from '@/components/tag-groups/TagGroupForm';

export function TagGroupsPage() {
  const { t } = useTranslation();
  const [page] = useState(0);
  const { data: paged, isLoading, error } = useTagGroups(page);
  const deleteTagGroup = useDeleteTagGroup();

  const [editTarget, setEditTarget] = useState<TagGroup | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const allTagGroups = paged?.content ?? [];

  const openNew = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  const openEdit = (tagGroup: TagGroup) => {
    setEditTarget(tagGroup);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setEditTarget(null), 200);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteTagGroup.mutateAsync(confirmDeleteId);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-dn-status-critical">
        {t('common.error')}: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title={t('tagGroups.title')}
        back="/settings"
        action={
          <Button onClick={openNew} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <Icon name="add" />
          </Button>
        }
      />

      <div className="px-5 space-y-4">
        {isLoading && allTagGroups.length === 0 && (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 rounded-full border-2 border-dn-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && allTagGroups.length === 0 ? (
          <EmptyState
            icon={<Icon name="auto_awesome_mosaic" />}
            title={t('tagGroups.noTagGroups')}
            description={t('tagGroups.noTagGroupsDesc')}
            action={
              <Button onClick={openNew} variant="secondary">
                <Icon name="add" className="mr-2" />
                {t('tagGroups.addTagGroup')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {allTagGroups.map((group) => (
              <Card key={group.id} className="group relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-dn-primary/10 text-dn-primary flex items-center justify-center shrink-0">
                      <Icon name={group.icon ?? 'label'} className="text-xl" />
                    </div>
                    <div>
                    <h3 className="font-medium text-dn-text-main">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-dn-text-muted mt-1">{group.description}</p>
                    )}
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
                    <button
                      onClick={() => openEdit(group)}
                      className="p-2 text-dn-text-muted hover:text-dn-primary transition-colors cursor-pointer"
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(group.id)}
                      className="p-2 text-dn-text-muted hover:text-dn-status-critical transition-colors cursor-pointer"
                      disabled={deleteTagGroup.isPending}
                    >
                      <Icon name="delete" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={closeModal} title={editTarget ? t('tagGroups.editTagGroup') : t('tagGroups.newTagGroup')}>
        <TagGroupForm
          initialData={editTarget ?? undefined}
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title={t('tagGroups.editTagGroup')}
        message={t('tagGroups.deleteConfirm')}
        confirmLabel={t('common.delete')}
        loading={deleteTagGroup.isPending}
      />
    </div>
  );
}
