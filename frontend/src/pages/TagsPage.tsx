import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Icon } from '@/components/ui/Icon';
import type { Tag } from '@/models';
import { useForm } from 'react-hook-form';

interface FormValues {
  name: string;
  description: string;
}

export function TagsPage() {
  const { t } = useTranslation();
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
    if (!confirm(t('tags.deleteConfirm'))) return;
    await deleteTag.mutateAsync(id);
  };

  const isSubmitting = createTag.isPending || updateTag.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('tags.title')}
        back
        subtitle={t('tags.count', { count: allTags.length })}
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
                  <Icon name="edit" className="text-base" />
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  disabled={deleteTag.isPending}
                  className="p-1 rounded-full text-dn-text-muted hover:text-dn-error transition-colors disabled:opacity-50"
                >
                  <Icon name="delete" className="text-base" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title={editTarget ? t('tags.editTag') : t('tags.newTag')}
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editTarget ? t('common.update') : t('common.create')}
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label={t('tags.tagName')}
            placeholder={t('tags.namePlaceholder')}
            error={errors.name?.message}
            {...register('name', { required: t('common.nameRequired') })}
          />
          <Textarea
            label={t('common.description')}
            placeholder={t('tags.descriptionPlaceholder')}
            {...register('description')}
          />
        </form>
      </Modal>
    </div>
  );
}
