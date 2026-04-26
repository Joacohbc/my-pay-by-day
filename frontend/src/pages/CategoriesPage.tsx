import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories, useDeleteCategory, useArchiveCategory, useUnarchiveCategory } from '@/hooks/useCategories';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import type { Category } from '@/models';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { Routes } from '@/lib/routes';
import { useDuplicates } from '@/hooks/useDuplicates';

type ConfirmActionType = 'archive' | 'unarchive' | 'delete';

const CONFIRM_TITLE_BY_TYPE: Record<ConfirmActionType, 'common.archive' | 'common.active' | 'common.delete'> = {
  archive: 'common.archive',
  unarchive: 'common.active',
  delete: 'common.delete',
};

export function CategoriesPage() {
  const { t } = useTranslation();
  const [showArchived, setShowArchived] = useState(false);
  const { data: paged, isLoading, error } = useCategories(showArchived ? true : undefined);
  const { data: allDuplicates } = useDuplicates('CATEGORY', 'PENDING');
  const deleteCategory = useDeleteCategory();
  const archiveCategory = useArchiveCategory();
  const unarchiveCategory = useUnarchiveCategory();

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ category: Category; type: ConfirmActionType } | null>(null);
  const [search, setSearch] = useState('');

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allCategories = paged ?? [];
  const filtered = search.trim()
    ? allCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : allCategories;

  const openCreate = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setShowModal(true);
  };

  const actionMutationByType: Record<ConfirmActionType, (id: number) => Promise<unknown>> = {
    archive: archiveCategory.mutateAsync,
    unarchive: unarchiveCategory.mutateAsync,
    delete: deleteCategory.mutateAsync,
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { category, type } = confirmAction;
    await actionMutationByType[type](category.id);
    setConfirmAction(null);
  };

  const isPending = archiveCategory.isPending || unarchiveCategory.isPending || deleteCategory.isPending;
  const confirmTitle = confirmAction ? t(CONFIRM_TITLE_BY_TYPE[confirmAction.type]) : '';
  const confirmMessage = !confirmAction
    ? ''
    : confirmAction.type === 'delete'
      ? t('categories.deleteConfirm')
      : t('categories.archiveConfirm', { name: confirmAction.category.name });

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
        title={t('categories.title')}
        back={Routes.SETTINGS}
        subtitle={t('categories.count', { count: allCategories.length })}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchived(v => !v)}
              className={`p-2 rounded-full transition-colors ${showArchived ? 'text-dn-primary bg-dn-primary/10' : 'text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low'}`}
              title={t('categories.showArchived')}
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

      <div className="px-5">
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
          title={t('categories.noCategories')}
          description={t('categories.noCategoriesDesc')}
          action={
            <Button size="sm" onClick={openCreate}>
              <Icon name="add" className="text-sm" />
              {t('categories.addCategory')}
            </Button>
          }
        />
      ) : (
        <div className="px-5 space-y-3">
          {filtered.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              duplicates={(allDuplicates ?? []).filter(r => r.entityId1 === cat.id || r.entityId2 === cat.id)}
              isPending={isPending}
              onEdit={openEdit}
              onArchive={(category) => setConfirmAction({ category, type: 'archive' })}
              onUnarchive={(category) => setConfirmAction({ category, type: 'unarchive' })}
              onDelete={(category) => setConfirmAction({ category, type: 'delete' })}
            />
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        title={editTarget ? t('categories.editCategory') : t('categories.newCategory')}
      >
        <CategoryForm
          editTarget={editTarget}
          onSuccess={() => setShowModal(false)}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

    </div>
  );
}
