import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeText } from '@/lib/utils/textUtils';
import { useTranslation } from 'react-i18next';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useTags, useDeleteTag, useArchiveTag, useUnarchiveTag } from '@/hooks/useTags';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import type { Tag } from '@/models';
import { TagForm } from '@/components/tags/TagForm';
import { TagCard } from '@/components/tags/TagCard';
import { Routes } from '@/lib/routes';
import { useDuplicates } from '@/hooks/useDuplicates';

type ConfirmActionType = 'archive' | 'unarchive' | 'delete';

const CONFIRM_TITLE_BY_TYPE: Record<ConfirmActionType, 'common.archive' | 'common.active' | 'common.delete'> = {
  archive: 'common.archive',
  unarchive: 'common.active',
  delete: 'common.delete',
};

export function TagsPage() {
  const { t } = useTranslation();
  const { navigate, fromRoute } = useAppNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
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
    ? allTags.filter(t => normalizeText(t.name).includes(normalizeText(search)))
    : allTags;

  const highlightId = Number(searchParams.get('highlight')) || null;
  const highlightTarget = highlightId ? allTags.find((tag) => tag.id === highlightId) ?? null : null;
  const modalEditTarget = editTarget ?? highlightTarget;
  const modalOpen = showModal || highlightTarget !== null;

  const openCreate = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  const openEdit = (tag: Tag) => {
    setEditTarget(tag);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    if (highlightId) setSearchParams((prev) => { prev.delete('highlight'); return prev; }, { replace: true });
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
        back={() => navigate(fromRoute ?? Routes.SETTINGS)}
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
            <TagCard
              key={tag.id}
              tag={tag}
              duplicates={(allDuplicates ?? []).filter(r => r.entityId1 === tag.id || r.entityId2 === tag.id)}
              isPending={isPending}
              onEdit={openEdit}
              onArchive={(selectedTag) => setConfirmAction({ tag: selectedTag, type: 'archive' })}
              onUnarchive={(selectedTag) => setConfirmAction({ tag: selectedTag, type: 'unarchive' })}
              onDelete={(selectedTag) => setConfirmAction({ tag: selectedTag, type: 'delete' })}
            />
          ))}
        </div>
      )}


      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalEditTarget ? t('tags.editTag') : t('tags.newTag')}
      >
        <TagForm
          editTarget={modalEditTarget}
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </Modal>

    </div>
  );
}
