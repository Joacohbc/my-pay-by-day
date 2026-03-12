import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNodes, useCreateNode, useUpdateNode, useArchiveNode, useDeleteNode, useNodeBalance } from '@/hooks/useNodes';
import { formatCurrency, formatCompactCurrency, formatCompactWitNotCurrency, getCurrency } from '@/lib/format';
import { NodeCard } from '@/components/nodes/NodeCard';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';
import type { FinanceNode, FinanceNodeType } from '@/models';
import { useForm, Controller } from 'react-hook-form';

interface NodeFormValues {
  name: string;
  type: FinanceNodeType;
}

function NodeBalanceBadge({ nodeId }: { nodeId: number }) {
  const { data: balance } = useNodeBalance(nodeId);
  if (balance === undefined) return null;
  return (
    <span className={`text-xs font-mono whitespace-nowrap ${balance >= 0 ? 'text-dn-success' : 'text-dn-error'}`}>
      <span className="flex flex-col items-center leading-none xs:hidden">
        <span>{formatCompactWitNotCurrency(balance)}</span>
        <span className="mt-1">{getCurrency()}</span>
      </span>
      <span className="hidden xs:inline sm:hidden">{formatCompactCurrency(balance)}</span>
      <span className="hidden sm:inline">{balance >= 0 ? '+' : ''}{formatCurrency(balance)}</span>
    </span>
  );
}

function NodeActionMenu({ node, onEdit, onArchive, onDelete }: {
  node: FinanceNode;
  onEdit: (node: FinanceNode) => void;
  onArchive: (node: FinanceNode) => void;
  onDelete: (node: FinanceNode) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
      >
        <Icon name="more_vert" className="text-lg" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-dn-surface border border-white/5 rounded-card shadow-xl min-w-36 overflow-hidden">
            <button
              onClick={() => { onEdit(node); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dn-text-main hover:bg-dn-surface-low transition-colors"
            >
              <Icon name="edit" className="text-base" />
              {t('common.edit')}
            </button>
            {!node.archived && (
              <button
                onClick={() => { onArchive(node); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dn-text-main hover:bg-dn-surface-low transition-colors"
              >
                <Icon name="archive" className="text-base" />
                {t('common.archive')}
              </button>
            )}
            <button
              onClick={() => { onDelete(node); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dn-error hover:bg-dn-error/10 transition-colors"
            >
              <Icon name="delete" className="text-base" />
              {t('common.delete')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function NodesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const { data: paged, isLoading, error } = useNodes(page);
  const createNode = useCreateNode();
  const updateNode = useUpdateNode();
  const archiveNode = useArchiveNode();
  const deleteNode = useDeleteNode();
  const [showModal, setShowModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingNode, setEditingNode] = useState<FinanceNode | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ node: FinanceNode; type: 'archive' | 'delete' } | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<NodeFormValues>({
    defaultValues: { name: '', type: 'OWN' },
  });

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allNodes = paged?.content ?? [];
  const totalPages = paged?.totalPages ?? 1;
  const activeNodes = allNodes.filter((n) => !n.archived);
  const archivedNodes = allNodes.filter((n) => n.archived);

  const displayNodes = showArchived ? allNodes : activeNodes;

  const onSubmit = async (values: NodeFormValues) => {
    if (editingNode) {
      await updateNode.mutateAsync({ id: editingNode.id, dto: { name: values.name, type: values.type } });
    } else {
      await createNode.mutateAsync({ name: values.name, type: values.type });
    }
    closeModal();
  };

  const openNewModal = () => {
    setEditingNode(null);
    reset({ name: '', type: 'OWN' });
    setShowModal(true);
  };

  const openEditModal = (node: FinanceNode) => {
    setEditingNode(node);
    reset({ name: node.name, type: node.type });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingNode(null);
    reset({ name: '', type: 'OWN' });
  };

  const nodeTypeOptions = [
    { value: 'OWN', label: t('nodes.ownAccountType') },
    { value: 'EXTERNAL', label: t('nodes.externalType') },
    { value: 'CONTACT', label: t('nodes.contactType') },
  ];

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { node, type } = confirmAction;
    if (type === 'archive') {
      await archiveNode.mutateAsync(node.id);
    } else {
      await deleteNode.mutateAsync(node.id);
    }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'archive' ? t('common.archive') : t('common.delete')}
        message={
          confirmAction?.type === 'archive'
            ? t('nodes.archiveConfirm', { name: confirmAction.node.name })
            : confirmAction?.node
            ? t('common.confirmDeleteNamed', { name: confirmAction.node.name })
            : ''
        }
        confirmLabel={confirmAction?.type === 'archive' ? t('common.archive') : t('common.delete')}
        loading={confirmAction?.type === 'archive' ? archiveNode.isPending : deleteNode.isPending}
      />

      <PageHeader
        title={t('nodes.title')}
        subtitle={t('nodes.activeCount', { count: paged?.totalElements ?? 0 })}
        action={
          <Button size="sm" onClick={openNewModal}>
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </Button>
        }
      />

      {/* Filter */}
      <div className="px-5 flex gap-2">
        <button
          onClick={() => setShowArchived(false)}
          className={[
            'px-4 py-1.5 rounded-pill text-xs font-medium transition-all cursor-pointer',
            !showArchived
              ? 'bg-dn-primary/20 text-dn-primary'
              : 'bg-dn-surface-low text-dn-text-muted hover:bg-dn-surface',
          ].join(' ')}
        >
          {t('common.active')}
        </button>
        {archivedNodes.length > 0 && (
          <button
            onClick={() => setShowArchived(true)}
            className={[
              'px-4 py-1.5 rounded-pill text-xs font-medium transition-all cursor-pointer',
              showArchived
                ? 'bg-dn-primary/20 text-dn-primary'
                : 'bg-dn-surface-low text-dn-text-muted hover:bg-dn-surface',
            ].join(' ')}
          >
            {t('common.all')} ({allNodes.length})
          </button>
        )}
      </div>

      {/* Groups by type */}
      {(['OWN', 'EXTERNAL', 'CONTACT'] as FinanceNodeType[]).map((type) => {
        const group = displayNodes.filter((n) => n.type === type);
        if (group.length === 0) return null;
        const labels: Record<FinanceNodeType, string> = {
          OWN: t('nodes.ownAccounts'),
          EXTERNAL: t('nodes.externalEntities'),
          CONTACT: t('nodes.contacts'),
        };
        return (
          <section key={type} className="px-5">
            <p className="text-xs font-medium text-dn-text-muted uppercase tracking-wider mb-3">
              {labels[type]}
            </p>
            <div className="space-y-3">
              {group.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  balance={undefined}
                  actions={
                    <div className="flex items-center gap-2">
                      <NodeBalanceBadge nodeId={node.id} />
                      <NodeActionMenu
                        node={node}
                        onEdit={openEditModal}
                        onArchive={(n) => setConfirmAction({ node: n, type: 'archive' })}
                        onDelete={(n) => setConfirmAction({ node: n, type: 'delete' })}
                      />
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      {displayNodes.length === 0 && (
        <EmptyState
          title={t('nodes.noNodesYet')}
          description={t('nodes.noNodesDesc')}
          action={
            <Button size="sm" onClick={openNewModal}>
              <Icon name="add" className="text-sm" />
              {t('nodes.addNode')}
            </Button>
          }
        />
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingNode ? t('common.edit') : t('nodes.newNode')}
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={createNode.isPending || updateNode.isPending}>
            {editingNode ? t('common.save') : t('nodes.createNode')}
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label={t('common.name')}
            placeholder={t('nodes.nodeNamePlaceholder')}
            error={errors.name?.message}
            {...register('name', { required: t('common.nameRequired') })}
          />
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                label={t('common.type')}
                options={nodeTypeOptions}
                {...field}
              />
            )}
          />
          <div className="bg-dn-surface-low rounded-input p-3 space-y-1 text-xs text-dn-text-muted">
            <p><span className="text-dn-text-main font-medium">{t('nodeType.OWN')}:</span> {t('nodes.ownDesc')}</p>
            <p><span className="text-dn-text-main font-medium">{t('nodeType.EXTERNAL')}:</span> {t('nodes.externalDesc')}</p>
            <p><span className="text-dn-text-main font-medium">{t('nodeType.CONTACT')}:</span> {t('nodes.contactDesc')}</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
