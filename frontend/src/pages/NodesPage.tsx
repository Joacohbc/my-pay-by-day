import { useState } from 'react';
import { useNodes, useCreateNode, useArchiveNode, useDeleteNode, useNodeBalance } from '@/hooks/useNodes';
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
    <span className={`text-xs font-mono ${balance >= 0 ? 'text-dn-success' : 'text-dn-error'}`}>
      {balance >= 0 ? '+' : ''}
      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance)}
    </span>
  );
}

function NodeActionMenu({ node }: { node: FinanceNode }) {
  const [open, setOpen] = useState(false);
  const archive = useArchiveNode();
  const del = useDeleteNode();

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
            {!node.archived && (
              <button
                onClick={() => { archive.mutate(node.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dn-text-main hover:bg-dn-surface-low transition-colors"
              >
                <Icon name="archive" className="text-base" />
                Archive
              </button>
            )}
            <button
              onClick={() => { del.mutate(node.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dn-error hover:bg-dn-error/10 transition-colors"
            >
              <Icon name="delete" className="text-base" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function NodesPage() {
  const { data: nodes, isLoading, error } = useNodes();
  const createNode = useCreateNode();
  const [showModal, setShowModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<NodeFormValues>({
    defaultValues: { name: '', type: 'OWN' },
  });

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allNodes = nodes ?? [];
  const activeNodes = allNodes.filter((n) => !n.archived);
  const archivedNodes = allNodes.filter((n) => n.archived);

  const displayNodes = showArchived ? allNodes : activeNodes;

  const onSubmit = async (values: NodeFormValues) => {
    await createNode.mutateAsync({ name: values.name, type: values.type });
    reset();
    setShowModal(false);
  };

  const nodeTypeOptions = [
    { value: 'OWN', label: 'Own Account (Bank, Cash, Credit)' },
    { value: 'EXTERNAL', label: 'External Entity (Shop, Employer)' },
    { value: 'CONTACT', label: 'Contact (Friend, Family)' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Finance Nodes"
        subtitle={`${activeNodes.length} active`}
        action={
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Icon name="add" className="text-sm" />
            New
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
          Active
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
            All ({allNodes.length})
          </button>
        )}
      </div>

      {/* Groups by type */}
      {(['OWN', 'EXTERNAL', 'CONTACT'] as FinanceNodeType[]).map((type) => {
        const group = displayNodes.filter((n) => n.type === type);
        if (group.length === 0) return null;
        const labels: Record<FinanceNodeType, string> = {
          OWN: 'Own Accounts',
          EXTERNAL: 'External Entities',
          CONTACT: 'Contacts',
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
                      <NodeActionMenu node={node} />
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
          title="No nodes yet"
          description="Add accounts, external entities, or contacts"
          action={
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Icon name="add" className="text-sm" />
              Add Node
            </Button>
          }
        />
      )}

      {/* Create Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title="New Finance Node"
        footer={
          <Button fullWidth onClick={handleSubmit(onSubmit)} loading={createNode.isPending}>
            Create Node
          </Button>
        }
      >
        <form className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Main Bank Account"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                label="Type"
                options={nodeTypeOptions}
                {...field}
              />
            )}
          />
          <div className="bg-dn-surface-low rounded-input p-3 space-y-1 text-xs text-dn-text-muted">
            <p><span className="text-dn-text-main font-medium">Own:</span> Your bank accounts, wallets, credit cards</p>
            <p><span className="text-dn-text-main font-medium">External:</span> Shops, employers, services (expenses/income)</p>
            <p><span className="text-dn-text-main font-medium">Contact:</span> Friends/family — money owed or lent</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
