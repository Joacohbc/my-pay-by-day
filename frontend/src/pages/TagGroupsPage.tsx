import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTagGroups, useDeleteTagGroup, useArchiveTagGroup, useUnarchiveTagGroup } from '@/hooks/useTagGroups';
import type { TagGroup } from '@/models';
import { TagGroupForm } from '@/components/tag-groups/TagGroupForm';

type ConfirmActionType = 'archive' | 'unarchive' | 'delete';

const CONFIRM_TITLE_BY_TYPE: Record<ConfirmActionType, 'common.archive' | 'common.active' | 'common.delete'> = {
  archive: 'common.archive',
  unarchive: 'common.active',
  delete: 'common.delete',
};

export function TagGroupsPage() {
  const { t } = useTranslation();
  const page = 0;
  const [showArchived, setShowArchived] = useState(false);
  const { data: paged, isLoading, error } = useTagGroups(page, 20, showArchived ? true : undefined);
  const deleteTagGroup = useDeleteTagGroup();
  const archiveTagGroup = useArchiveTagGroup();
  const unarchiveTagGroup = useUnarchiveTagGroup();

  const [editTarget, setEditTarget] = useState<TagGroup | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ group: TagGroup; type: ConfirmActionType } | null>(null);

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

  const actionMutationByType: Record<ConfirmActionType, (id: number) => Promise<unknown>> = {
    archive: archiveTagGroup.mutateAsync,
    unarchive: unarchiveTagGroup.mutateAsync,
    delete: deleteTagGroup.mutateAsync,
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { group, type } = confirmAction;
    try {
      await actionMutationByType[type](group.id);
    } finally {
      setConfirmAction(null);
    }
  };

  const isPending = archiveTagGroup.isPending || unarchiveTagGroup.isPending || deleteTagGroup.isPending;
  const confirmTitle = confirmAction ? t(CONFIRM_TITLE_BY_TYPE[confirmAction.type]) : '';
  const confirmMessage = !confirmAction
    ? ''
    : confirmAction.type === 'delete'
      ? t('tagGroups.deleteConfirm')
      : t('tagGroups.archiveConfirm', { name: confirmAction.group.name });

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchived(v => !v)}
              className={`p-2 rounded-full transition-colors ${showArchived ? 'text-dn-primary bg-dn-primary/10' : 'text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low'}`}
              title={t('tagGroups.showArchived')}
            >
              <Icon name="inventory_2" className="text-base" />
            </button>
            <Button onClick={openNew} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
              <Icon name="add" />
            </Button>
          </div>
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
              <Card key={group.id} className={`group relative ${group.archived ? 'opacity-60' : ''}`}>
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
                    {!group.archived && (
                      <button
                        onClick={() => openEdit(group)}
                        className="p-2 text-dn-text-muted hover:text-dn-primary transition-colors cursor-pointer"
                      >
                        <Icon name="edit" />
                      </button>
                    )}
                    {group.archived ? (
                      <button
                        onClick={() => setConfirmAction({ group, type: 'unarchive' })}
                        className="p-2 text-dn-text-muted hover:text-dn-primary transition-colors cursor-pointer"
                        disabled={isPending}
                      >
                        <Icon name="unarchive" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ group, type: 'archive' })}
                        className="p-2 text-dn-text-muted hover:text-dn-text-main transition-colors cursor-pointer"
                        disabled={isPending}
                      >
                        <Icon name="archive" />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmAction({ group, type: 'delete' })}
                      className="p-2 text-dn-text-muted hover:text-dn-status-critical transition-colors cursor-pointer"
                      disabled={isPending}
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
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmTitle}
        loading={isPending}
      />
    </div>
  );
}
