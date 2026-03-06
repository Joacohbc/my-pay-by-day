import { useState } from 'react';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/hooks/useTags';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Tag } from '@/models';
import { useForm } from 'react-hook-form';

interface FormValues {
  name: string;
  description: string;
}

export function TagsPage() {
  const { data: tags, isLoading, error } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [editTarget, setEditTarget] = useState<Tag | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', description: '' },
  });

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allTags = tags ?? [];

  const openCreate = () => {
    setEditTarget(null);
    reset({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (tag: Tag) => {
    setEditTarget(tag);
    setValue('name', tag.name);
    setValue('description', tag.description ?? '');
    setShowModal(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (editTarget) {
      await updateTag.mutateAsync({ id: editTarget.id, dto: values });
    } else {
      await createTag.mutateAsync(values);
    }
    reset();
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this tag?')) return;
    await deleteTag.mutateAsync(id);
  };

  const isSubmitting = createTag.isPending || updateTag.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tags"
        back
        subtitle={`${allTags.length} tags`}
        action={
          <Button size="sm" onClick={openCreate}>
            <span className="material-symbols-outlined text-sm">add</span>
            New
          </Button>
        }
      />

      {/* Description */}
      <div className="px-5">
        <p className="text-sm text-dn-text-muted">
          Tags are transversal labels (e.g. <span className="text-dn-primary">#Vacation2026</span>,{' '}
          <span className="text-dn-primary">#Reimbursable</span>) that can be applied to multiple
          events for cross-cutting reports.
        </p>
      </div>

      {allTags.length === 0 ? (
        <EmptyState
          icon={<span className="material-symbols-outlined">tag</span>}
          title="No tags yet"
          description="Create tags to group events across different categories"
          action={
            <Button size="sm" onClick={openCreate}>
              <span className="material-symbols-outlined text-sm">add</span>
              Add Tag
            </Button>
          }
        />
      ) : (
        <div className="px-5 flex flex-wrap gap-3">
          {allTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 bg-dn-surface rounded-card px-4 py-3 group"
            >
              <Badge variant="indigo">#{tag.name}</Badge>
              {tag.description && (
                <span className="text-xs text-dn-text-muted max-w-32 truncate hidden sm:block">
                  {tag.description}
                </span>
              )}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(tag)}
                  className="p-1 rounded-full text-dn-text-muted hover:text-dn-text-main transition-colors"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  disabled={deleteTag.isPending}
                  className="p-1 rounded-full text-dn-text-muted hover:text-dn-error transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title={editTarget ? 'Edit Tag' : 'New Tag'}
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editTarget ? 'Update' : 'Create'}
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label="Tag Name"
            placeholder="e.g. Vacation2026, Reimbursable"
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
