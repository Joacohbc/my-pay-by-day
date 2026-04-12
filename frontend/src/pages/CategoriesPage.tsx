import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
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

export function CategoriesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const { data: paged, isLoading, error } = useCategories(page);
  const deleteCategory = useDeleteCategory();

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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


  const handleDelete = (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return;
    await deleteCategory.mutateAsync(confirmDeleteId);
    setConfirmDeleteId(null);
  };


  return (
    <div className="space-y-4">
      <ConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={t('categories.deleteConfirm')}
        confirmLabel={t('common.delete')}
        loading={deleteCategory.isPending}
      />

      <PageHeader
        title={t('categories.title')}
        back={Routes.SETTINGS}
        subtitle={t('categories.count', { count: paged?.totalElements ?? 0 })}
        action={
          <Button size="sm" onClick={openCreate}>
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </Button>
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
            <Card key={cat.id} className="flex items-center gap-4">
              <CategoryIcon category={cat} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-dn-text-main">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-dn-text-muted truncate">{cat.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
                >
                  <Icon name="edit" className="text-base" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  disabled={deleteCategory.isPending}
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
