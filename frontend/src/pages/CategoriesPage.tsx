import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories, useDeleteCategory, useArchiveCategory, useUnarchiveCategory } from '@/hooks/useCategories';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Pagination } from '@/components/ui/Pagination';
import type { Category } from '@/models';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { Routes } from '@/lib/routes';

type ConfirmActionType = 'archive' | 'unarchive' | 'delete';

const CONFIRM_TITLE_BY_TYPE: Record<ConfirmActionType, 'common.archive' | 'common.active' | 'common.delete'> = {
  archive: 'common.archive',
  unarchive: 'common.active',
  delete: 'common.delete',
};

export function CategoriesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const { data: paged, isLoading, error } = useCategories(page, 20, showArchived ? true : undefined);
  const deleteCategory = useDeleteCategory();
  const archiveCategory = useArchiveCategory();
  const unarchiveCategory = useUnarchiveCategory();

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ category: Category; type: ConfirmActionType } | null>(null);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allCategories = paged?.content ?? [];
  const totalPages = paged?.totalPages ?? 1;

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
        subtitle={t('categories.count', { count: paged?.totalElements ?? 0 })}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowArchived(v => !v); setPage(0); }}
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

      {allCategories.length === 0 ? (
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
          {allCategories.map((cat) => (
            <Card key={cat.id} className={`flex items-center gap-4 ${cat.archived ? 'opacity-60' : ''}`}>
              <CategoryIcon category={cat} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-dn-text-main">{cat.name}</p>
                  {cat.archived && (
                    <span className="text-xs bg-dn-surface-low text-dn-text-muted px-1.5 py-0.5 rounded">
                      {t('common.archived')}
                    </span>
                  )}
                </div>
                {cat.description && (
                  <p className="text-xs text-dn-text-muted truncate">{cat.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!cat.archived && (
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
                  >
                    <Icon name="edit" className="text-base" />
                  </button>
                )}
                {cat.archived ? (
                  <button
                    onClick={() => setConfirmAction({ category: cat, type: 'unarchive' })}
                    disabled={isPending}
                    className="p-2 rounded-full text-dn-text-muted hover:text-dn-primary hover:bg-dn-primary/10 transition-colors disabled:opacity-50"
                  >
                    <Icon name="unarchive" className="text-base" />
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction({ category: cat, type: 'archive' })}
                    disabled={isPending}
                    className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors disabled:opacity-50"
                  >
                    <Icon name="archive" className="text-base" />
                  </button>
                )}
                <button
                  onClick={() => setConfirmAction({ category: cat, type: 'delete' })}
                  disabled={isPending}
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
