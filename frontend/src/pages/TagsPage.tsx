import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTags, useDeleteTag, useArchiveTag, useUnarchiveTag } from '@/hooks/useTags';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import type { Tag } from '@/models';
import { TagForm } from '@/components/tags/TagForm';
import { Routes } from '@/lib/routes';
import { useDuplicates } from '@/hooks/useDuplicates';
import { SimpleEntityDuplicatesSection } from '@/components/duplicates/SimpleEntityDuplicatesSection';

type ConfirmActionType = 'archive' | 'unarchive' | 'delete';

const CONFIRM_TITLE_BY_TYPE: Record<ConfirmActionType, 'common.archive' | 'common.active' | 'common.delete'> = {
  archive: 'common.archive',
  unarchive: 'common.active',
  delete: 'common.delete',
};

export function TagsPage() {
  const { t } = useTranslation();
  const [showArchived, setShowArchived] = useState(false);
  const { data: paged, isLoading, error } = useTags(showArchived ? true : undefined);
  const { data: allDuplicates } = useDuplicates('TAG', 'PENDING');
  const deleteTag = useDeleteTag();
  const archiveTag = useArchiveTag();
  const unarchiveTag = useUnarchiveTag();

  const [editTarget, setEditTarget] = useState<Tag | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ tag: Tag; type: ConfirmActionType } | null>(null);
  const [search, setSearch] = useState('');

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allTags = paged ?? [];
  const filtered = search.trim()
    ? allTags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : allTags;

  const openCreate = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  const openEdit = (tag: Tag) => {
    setEditTarget(tag);
    setShowModal(true);
  };

  const actionMutationByType: Record<ConfirmActionType, (id: number) => Promise<unknown>> = {
    archive: archiveTag.mutateAsync,
    unarchive: unarchiveTag.mutateAsync,
    delete: deleteTag.mutateAsync,
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { tag, type } = confirmAction;
    await actionMutationByType[type](tag.id);
    setConfirmAction(null);
  };

  const isPending = archiveTag.isPending || unarchiveTag.isPending || deleteTag.isPending;
  const confirmTitle = confirmAction ? t(CONFIRM_TITLE_BY_TYPE[confirmAction.type]) : '';
  const confirmMessage = !confirmAction
    ? ''
    : confirmAction.type === 'delete'
      ? t('tags.deleteConfirm')
      : t('tags.archiveConfirm', { name: confirmAction.tag.name });

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmTitle}
        loading={isPending}
      />

      <PageHeader
        title={t('tags.title')}
        back={Routes.SETTINGS}
        subtitle={t('tags.count', { count: allTags.length })}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchived(v => !v)}
              className={`p-2 rounded-full transition-colors ${showArchived ? 'text-dn-primary bg-dn-primary/10' : 'text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low'}`}
              title={t('tags.showArchived')}
            >
              <Icon name="inventory_2" className="text-base" />
            </button>
            <Button size="sm" onClick={openCreate}>
              <Icon name="add" className="text-sm" />
              {t('common.new')}
            </Button>
          </div>
        }
      />

      <div className="px-5 space-y-2">
        <p className="text-sm text-dn-text-muted">{t('tags.explanation')}</p>
        <div className="relative">
          <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dn-text-muted text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full bg-dn-surface-low rounded-input pl-8 pr-3 py-1.5 text-xs text-dn-text-main outline-none focus:ring-1 focus:ring-dn-primary/50 placeholder:text-dn-text-muted/50"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Icon name="tag" />}
          title={t('tags.noTags')}
          description={t('tags.noTagsDesc')}
          action={
            <Button size="sm" onClick={openCreate}>
              <Icon name="add" className="text-sm" />
              {t('tags.addTag')}
            </Button>
          }
        />
      ) : (
        <div className="px-5 space-y-3">
          {filtered.map((tag) => (
            <Card key={tag.id} className={`${tag.archived ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-dn-primary/10 text-dn-primary flex items-center justify-center shrink-0">
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
                    onClick={() => openEdit(tag)}
                    className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
                  >
                    <Icon name="edit" className="text-base" />
                  </button>
                )}
                {tag.archived ? (
                  <button
                    onClick={() => setConfirmAction({ tag, type: 'unarchive' })}
                    disabled={isPending}
                    className="p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors disabled:opacity-50"
                  >
                    <Icon name="unarchive" className="text-base" />
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction({ tag, type: 'archive' })}
                    disabled={isPending}
                    className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors disabled:opacity-50"
                  >
                    <Icon name="archive" className="text-base" />
                  </button>
                )}
                <button
                  onClick={() => setConfirmAction({ tag, type: 'delete' })}
                  disabled={isPending}
                  className="p-2 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
                >
                  <Icon name="delete" className="text-base" />
                </button>
              </div>
            </div>
            {tag.description && (
              <p className="text-xs text-dn-text-muted mt-2 p-2 text-pretty">{tag.description}</p>
            )}
            <SimpleEntityDuplicatesSection
              records={(allDuplicates ?? []).filter(r => r.entityId1 === tag.id || r.entityId2 === tag.id)}
              currentId={tag.id}
            />
            </Card>
          ))}
        </div>
      )}


      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        title={editTarget ? t('tags.editTag') : t('tags.newTag')}
      >
        <TagForm
          editTarget={editTarget}
          onSuccess={() => setShowModal(false)}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

    </div>
  );
}
