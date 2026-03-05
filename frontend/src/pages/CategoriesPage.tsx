import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import type { Category } from '@/models';
import { useForm } from 'react-hook-form';

interface FormValues {
  name: string;
  description: string;
}

export function CategoriesPage() {
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
    if (!confirm('Delete this category?')) return;
    await deleteCategory.mutateAsync(id);
  };

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categories"
        back
        subtitle={`${allCategories.length} categories`}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} />
            New
          </Button>
        }
      />

      {allCategories.length === 0 ? (
        <EmptyState
          title="No categories"
          description="Categories help classify your events as budget buckets"
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} />
              Add Category
            </Button>
          }
        />
      ) : (
        <div className="px-4 space-y-2">
          {allCategories.map((cat) => (
            <Card key={cat.id} className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 shrink-0 font-bold text-sm">
                {cat.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-zinc-500 truncate">{cat.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  disabled={deleteCategory.isPending}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title={editTarget ? 'Edit Category' : 'New Category'}
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editTarget ? 'Update' : 'Create'}
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Food, Transport, Utilities"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Textarea
            label="Description"
            placeholder="Optional description"
            {...register('description')}
          />
        </form>
      </Modal>
    </div>
  );
}
