import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import type { Category } from '@/models';
import { useForm } from 'react-hook-form';

interface FormValues {
  name: string;
  description: string;
}

export function CategoriesPage() {
  const { t } = useTranslation();
  const { data: categories, isLoading, error } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', description: '' },
  });

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allCategories = categories ?? [];

  const openCreate = () => {
    setEditTarget(null);
    reset({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setValue('name', cat.name);
    setValue('description', cat.description ?? '');
    setShowModal(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (editTarget) {
      await updateCategory.mutateAsync({ id: editTarget.id, dto: values });
    } else {
      await createCategory.mutateAsync(values);
    }
    reset();
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('categories.deleteConfirm'))) return;
    await deleteCategory.mutateAsync(id);
  };

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('categories.title')}
        back
        subtitle={t('categories.count', { count: allCategories.length })}
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
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-dn-primary/10 text-dn-primary shrink-0 font-bold text-base">
                {cat.name[0].toUpperCase()}
              </div>
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

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title={editTarget ? t('categories.editCategory') : t('categories.newCategory')}
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editTarget ? t('common.update') : t('common.create')}
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label={t('common.name')}
            placeholder={t('categories.namePlaceholder')}
            error={errors.name?.message}
            {...register('name', { required: t('common.nameRequired') })}
          />
          <Textarea
            label={t('common.description')}
            placeholder={t('categories.descriptionPlaceholder')}
            {...register('description')}
          />
        </form>
      </Modal>
    </div>
  );
}
