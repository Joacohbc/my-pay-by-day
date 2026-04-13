import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTags, useDeleteTag } from '@/hooks/useTags';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import type { Tag } from '@/models';
import { TagForm } from '@/components/tags/TagForm';
import { Routes } from '@/lib/routes';

export function TagsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const { data: paged, isLoading, error } = useTags(page);
  const deleteTag = useDeleteTag();

  const [editTarget, setEditTarget] = useState<Tag | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allTags = paged?.content ?? [];
  const totalPages = paged?.totalPages ?? 1;

  const openCreate = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  const openEdit = (tag: Tag) => {
    setEditTarget(tag);
    setShowModal(true);
  };


  const handleDelete = (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return;
    await deleteTag.mutateAsync(confirmDeleteId);
    setConfirmDeleteId(null);
  };


  return (
    <div className="space-y-4">
      <ConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={t('tags.deleteConfirm')}
        confirmLabel={t('common.delete')}
        loading={deleteTag.isPending}
      />

      <PageHeader
        title={t('tags.title')}
        back={Routes.SETTINGS}
        subtitle={t('tags.count', { count: paged?.totalElements ?? 0 })}
        action={
          <Button size="sm" onClick={openCreate}>
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </Button>
        }
      />

      {/* Description */}
      <div className="px-5">
        <p className="text-sm text-dn-text-muted">
          {t('tags.explanation')}
        </p>
      </div>

      {allTags.length === 0 ? (
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
          {allTags.map((tag) => (
            <Card key={tag.id} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-dn-primary/10 text-dn-primary flex items-center justify-center shrink-0">
                <span className="text-lg font-bold">#</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-dn-text-main">{tag.name}</p>
                {tag.description && (
                  <p className="text-xs text-dn-text-muted truncate">{tag.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(tag)}
                  className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
                >
                  <Icon name="edit" className="text-base" />
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  disabled={deleteTag.isPending}
                  className="p-2 rounded-full text-dn-text-muted hover:text-dn-error hover:bg-dn-error/10 transition-colors disabled:opacity-50"
                >
                  <Icon name="delete" className="text-base" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

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
