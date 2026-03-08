import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/useTemplates';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useNodes } from '@/hooks/useNodes';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import type { Template, EventType, ModifierType } from '@/models';

const EVENT_TYPE_LABELS: Record<string, string> = {
  INBOUND: 'Income',
  OUTBOUND: 'Expense',
  OTHER: 'Transfer',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  INBOUND: 'text-dn-success bg-dn-success/10',
  OUTBOUND: 'text-dn-error bg-dn-error/10',
  OTHER: 'text-dn-text-muted bg-dn-surface-low',
};

interface FormValues {
  name: string;
  description: string;
  eventType: string;
  originNodeId: string;
  destinationNodeId: string;
  categoryId: string;
  tagIds: string[];
  modifierType: string;
  modifierValue: string;
}

const DEFAULT_FORM: FormValues = {
  name: '',
  description: '',
  eventType: '',
  originNodeId: '',
  destinationNodeId: '',
  categoryId: '',
  tagIds: [],
  modifierType: '',
  modifierValue: '',
};

export function TemplatesPage() {
  const { t } = useTranslation();
  const { data: templates, isLoading, error } = useTemplates();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: nodes = [] } = useNodes();

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [showModal, setShowModal] = useState(false);

  const activeNodes = nodes.filter((n) => !n.archived);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_FORM });

  const watchModifierType = watch('modifierType');

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allTemplates = templates ?? [];

  const openCreate = () => {
    setEditTarget(null);
    reset(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    setEditTarget(t);
    reset({
      name: t.name,
      description: t.description ?? '',
      eventType: t.eventType ?? '',
      originNodeId: t.originNodeId ? String(t.originNodeId) : '',
      destinationNodeId: t.destinationNodeId ? String(t.destinationNodeId) : '',
      categoryId: t.category ? String(t.category.id) : '',
      tagIds: t.tags.map((tag) => String(tag.id)),
      modifierType: t.modifierType ?? '',
      modifierValue: t.modifierValue !== undefined ? String(t.modifierValue) : '',
    });
    setShowModal(true);
  };

  const onSubmit = async (values: FormValues) => {
    const dto = {
      name: values.name,
      description: values.description || undefined,
      originNodeId: values.originNodeId ? Number(values.originNodeId) : undefined,
      destinationNodeId: values.destinationNodeId ? Number(values.destinationNodeId) : undefined,
      category: values.categoryId ? { id: Number(values.categoryId) } : undefined,
      tags: values.tagIds.map((id) => ({ id: Number(id) })),
      eventType: (values.eventType as EventType) || undefined,
      modifierType: (values.modifierType as ModifierType) || undefined,
      modifierValue:
        values.modifierType && values.modifierValue ? Number(values.modifierValue) : undefined,
    };

    if (editTarget) {
      await updateTemplate.mutateAsync({ id: editTarget.id, dto });
    } else {
      await createTemplate.mutateAsync(dto);
    }
    reset(DEFAULT_FORM);
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('templates.deleteConfirm'))) return;
    await deleteTemplate.mutateAsync(id);
  };

  const isSubmitting = createTemplate.isPending || updateTemplate.isPending;

  const nodeOptions = activeNodes.map((n) => ({ value: String(n.id), label: n.name }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('templates.title')}
        back
        subtitle={t('templates.count', { count: allTemplates.length })}
        action={
          <Button size="sm" onClick={openCreate}>
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </Button>
        }
      />

      {allTemplates.length === 0 ? (
        <EmptyState
          title={t('templates.noTemplates')}
          description={t('templates.noTemplatesDesc')}
          action={
            <Button size="sm" onClick={openCreate}>
              <Icon name="add" className="text-sm" />
              {t('templates.addTemplate')}
            </Button>
          }
        />
      ) : (
        <div className="px-5 space-y-3">
          {allTemplates.map((tpl) => (
            <Card key={tpl.id} className="flex items-start gap-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-dn-primary/10 text-dn-primary shrink-0 mt-0.5">
                <Icon name="auto_fix_high" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-medium text-dn-text-main">{tpl.name}</p>
                  {tpl.eventType && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-pill font-medium ${EVENT_TYPE_COLORS[tpl.eventType] ?? 'text-dn-text-muted bg-dn-surface-low'}`}
                    >
                      {EVENT_TYPE_LABELS[tpl.eventType]}
                    </span>
                  )}
                </div>
                {tpl.description && (
                  <p className="text-xs text-dn-text-muted mt-0.5 truncate">{tpl.description}</p>
                )}
                {(tpl.originNodeName || tpl.destinationNodeName) && (
                  <p className="text-xs text-dn-text-muted mt-0.5">
                    {tpl.originNodeName}
                    {tpl.destinationNodeName && (
                      <span> → {tpl.destinationNodeName}</span>
                    )}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {tpl.category && (
                    <span className="text-xs text-dn-text-muted">{tpl.category.name}</span>
                  )}
                  {tpl.tags.map((tag) => (
                    <span key={tag.id} className="text-xs text-dn-text-muted/70">
                      #{tag.name}
                    </span>
                  ))}
                  {tpl.modifierType && tpl.modifierValue !== undefined && (
                    <span className="text-xs text-dn-primary/80">
                      {tpl.modifierType === 'PERCENTAGE'
                        ? `${tpl.modifierValue}% modifier`
                        : `+$${tpl.modifierValue} fixed`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(tpl)}
                  className="p-2 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
                >
                  <Icon name="edit" className="text-base" />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  disabled={deleteTemplate.isPending}
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
        onClose={() => {
          setShowModal(false);
          reset(DEFAULT_FORM);
        }}
        title={editTarget ? t('templates.editTemplate') : t('templates.newTemplate')}
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editTarget ? t('common.update') : t('common.create')}
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label={t('common.name')}
            placeholder={t('templates.namePlaceholder')}
            error={errors.name?.message}
            {...register('name', { required: t('common.nameRequired') })}
          />

          <Textarea
            label={t('common.description')}
            placeholder={t('templates.descriptionPlaceholder')}
            {...register('description')}
          />

          <Controller
            name="eventType"
            control={control}
            render={({ field }) => (
              <Select
                label={t('templates.eventType')}
                placeholder={t('common.none')}
                options={[
                  { value: 'INBOUND', label: t('eventType.INBOUND') },
                  { value: 'OUTBOUND', label: t('eventType.OUTBOUND') },
                  { value: 'OTHER', label: t('eventType.OTHER') },
                ]}
                {...field}
              />
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="originNodeId"
              control={control}
              render={({ field }) => (
                <Select
                  label={t('templates.originNode')}
                  placeholder={t('common.none')}
                  options={nodeOptions}
                  {...field}
                />
              )}
            />
            <Controller
              name="destinationNodeId"
              control={control}
              render={({ field }) => (
                <Select
                  label={t('templates.destinationNode')}
                  placeholder={t('common.none')}
                  options={nodeOptions}
                  {...field}
                />
              )}
            />
          </div>

          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select
                label={t('eventForm.category')}
                placeholder={t('common.none')}
                options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                {...field}
              />
            )}
          />

          {tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-2">
                {t('eventForm.tags')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Controller
                  name="tagIds"
                  control={control}
                  render={({ field }) => (
                    <>
                      {tags.map((tag) => {
                        const selected = field.value?.includes(String(tag.id));
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              const current = field.value ?? [];
                              if (selected) {
                                field.onChange(current.filter((id) => id !== String(tag.id)));
                              } else {
                                field.onChange([...current, String(tag.id)]);
                              }
                            }}
                            className={[
                              'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer',
                              selected
                                ? 'bg-dn-primary/20 border-dn-primary/30 text-dn-primary'
                                : 'bg-dn-surface-low border-white/5 text-dn-text-muted hover:border-white/10',
                            ].join(' ')}
                          >
                            #{tag.name}
                          </button>
                        );
                      })}
                    </>
                  )}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="modifierType"
              control={control}
              render={({ field }) => (
                <Select
                  label={t('templates.modifierType')}
                  placeholder={t('common.none')}
                  options={[
                    { value: 'PERCENTAGE', label: t('templates.percentage') },
                    { value: 'FIXED', label: t('templates.fixed') },
                  ]}
                  {...field}
                />
              )}
            />
            {watchModifierType && (
              <Input
                label={t('templates.modifierValue')}
                placeholder={watchModifierType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 5.00'}
                type="number"
                step="0.01"
                min="0"
                {...register('modifierValue')}
              />
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
