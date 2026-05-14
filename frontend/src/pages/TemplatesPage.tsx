import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/useTemplates';
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
import { truncate } from '@/lib/format';
import type { Template, CreateTemplateDto } from '@/models';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { Routes } from '@/lib/routes';
import { useAccumulatedData } from '@/hooks/useAccumulatedData';

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

export function TemplatesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const { data: paged, isLoading, error } = useTemplates(page);

  const { displayedData: allTemplates } = useAccumulatedData(
    paged?.content,
    page,
    setPage,
    []
  );

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  if (isLoading && page === 0) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const totalPages = paged?.totalPages ?? 1;

  const openCreate = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  const openEdit = (tpl: Template) => {
    setEditTarget(tpl);
    setShowModal(true);
  };

  const handleSubmit = async (dto: CreateTemplateDto) => {
    if (editTarget) {
      await updateTemplate.mutateAsync({ id: editTarget.id, dto });
    } else {
      await createTemplate.mutateAsync(dto);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return;
    await deleteTemplate.mutateAsync(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const isSubmitting = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={t('templates.deleteConfirm')}
        confirmLabel={t('common.delete')}
        loading={deleteTemplate.isPending}
      />

      <PageHeader
        title={t('templates.title')}
        back={Routes.SETTINGS}
        subtitle={t('templates.count', { count: paged?.totalElements ?? 0 })}
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
            <Card key={tpl.id} className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-dn-primary/10 text-dn-primary shrink-0 mt-0.5">
                  <Icon name="auto_fix_high" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-medium text-dn-text-main">
                      {truncate(tpl.name, 40)}
                    </p>
                    {tpl.eventType && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-pill font-medium ${EVENT_TYPE_COLORS[tpl.eventType] ?? 'text-dn-text-muted bg-dn-surface-low'}`}
                      >
                        {EVENT_TYPE_LABELS[tpl.eventType]}
                      </span>
                    )}
                </div>
                {(tpl.originNodeName || tpl.destinationNodeName) && (
                  <p className="text-xs text-dn-text-muted mt-2">
                    {tpl.originNodeName}
                    {tpl.destinationNodeName && (
                      <span> → {tpl.destinationNodeName}</span>
                    )}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {tpl.category && (
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon category={tpl.category} size="sm" />
                      <span className="text-xs text-dn-text-muted">{tpl.category.name}</span>
                    </div>
                  )}
                  {tpl.tags.map((tag) => (
                    <span key={tag.id} className="text-xs text-dn-text-muted/70">
                      #{tag.name}
                    </span>
                  ))}
                  {tpl.modifierType && tpl.modifierValue != null && (
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
            </div>
            {tpl.description && (
              <p className="text-xs text-dn-text-muted mt-2 p-2 text-pretty">{tpl.description}</p>
            )}
          </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? t('templates.editTemplate') : t('templates.newTemplate')}
      >
        <TemplateForm
          editTarget={editTarget}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
          loading={isSubmitting}
        />
      </Modal>
    </div>
  );
}
