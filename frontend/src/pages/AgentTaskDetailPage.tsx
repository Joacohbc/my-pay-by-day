import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useAgentTask,
  useAgentTaskSocket,
  useCancelAgentTask,
  useDeleteAgentTask,
  useResumeAgentTask,
  useApproveAction,
  useRejectAction,
} from '@/hooks/useAgentTasks';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Routes } from '@/lib/routes';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-dn-text-muted bg-dn-surface-low',
  RUNNING: 'text-dn-primary bg-dn-primary/10',
  RETRYING: 'text-dn-warning bg-dn-warning/10',
  PAUSED: 'text-dn-warning bg-dn-warning/10',
  COMPLETED: 'text-dn-success bg-dn-success/10',
  FAILED: 'text-dn-error bg-dn-error/10',
  CANCELLED: 'text-dn-text-muted bg-dn-surface-low',
  INTERRUPTED: 'text-dn-error bg-dn-error/10',
};

export function AgentTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: task, isLoading, error } = useAgentTask(id || '');
  useAgentTaskSocket(id || null); // Merges WS updates directly into Query cache

  const cancelTask = useCancelAgentTask();
  const deleteTask = useDeleteAgentTask();
  const resumeTask = useResumeAgentTask();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;
  if (!task) return <ErrorState message="Task not found" />;

  const isRunning = task.status === 'RUNNING' || task.status === 'RETRYING';
  const isPaused = task.status === 'PAUSED';
  const isDone = task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED';

  const handleDelete = async () => {
    if (!id) return;
    await deleteTask.mutateAsync(id);
    navigate(Routes.AGENT_TASKS);
  };

  const handleAction = async (actionId: number, approve: boolean) => {
    if (!id) return;
    if (approve) {
      await approveAction.mutateAsync({ taskId: id, actionId });
    } else {
      await rejectAction.mutateAsync({ taskId: id, actionId });
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('agentTasks.delete')}
        message={t('common.deleteConfirm')}
        confirmLabel={t('common.delete')}
        loading={deleteTask.isPending}
      />

      <PageHeader
        title={task.instruction || t('agentTasks.title')}
        back={Routes.AGENT_TASKS}
        action={
          <div className="flex items-center gap-2">
            {!isDone && !isPaused && (
              <Button
                variant="secondary"
                size="sm"
                className="text-dn-error border-dn-error"
                loading={cancelTask.isPending}
                disabled={task.status === "CANCELLED"}
                onClick={() => cancelTask.mutate(task.id)}
              >
                <Icon name="close" className="text-sm" />
              </Button>
            )}
            {isPaused && (
              <Button
                variant="secondary"
                size="sm"
                loading={resumeTask.isPending}
                onClick={() => resumeTask.mutate(task.id)}
              >
                <Icon name="play_arrow" className="text-sm" />
                {t('agentTasks.resume')}
              </Button>
            )}
            {isDone && (
              <Button
                variant="secondary"
                size="sm"
                className="text-dn-error border-dn-error"
                onClick={() => setConfirmDelete(true)}
              >
                <Icon name="delete" className="text-sm" />
              </Button>
            )}
          </div>
        }
      />

      <div className="px-5 space-y-4">
        {/* Status Card */}
        <Card className="p-4 space-y-3 bg-dn-surface-low/50">
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLORS[task.status] ?? 'text-dn-text-muted bg-dn-surface-low'}`}>
              {task.status}
            </span>
            <span className="text-xs font-mono text-dn-text-muted">ID: {task.id.slice(0, 8)}...</span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-dn-text-main mb-1">{t('agentTasks.instruction')}</h3>
            <p className="text-sm text-dn-text-muted whitespace-pre-wrap font-mono p-2 bg-dn-surface rounded-md border border-dn-border/50">
              {task.instruction}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-dn-border">
            <div className="flex flex-col">
              <span className="text-[10px] text-dn-text-muted uppercase tracking-wider">{t('agentTasks.inputTokens')}</span>
              <span className="font-mono text-sm font-bold text-dn-text-main">{task.totalInputTokens}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-dn-text-muted uppercase tracking-wider">{t('agentTasks.outputTokens')}</span>
              <span className="font-mono text-sm font-bold text-dn-text-main">{task.totalOutputTokens}</span>
            </div>
          </div>
        </Card>

        {/* Current Progress overlay when running */}
        {isRunning && (
          <div className="flex items-center gap-3 p-3 bg-dn-primary/10 rounded-xl border border-dn-primary/30">
            <Icon name="sync" className="animate-spin text-dn-primary text-xl shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-medium text-dn-primary">{task.currentStep || 'Initializing...'}</span>
                <span className="text-xs font-bold text-dn-primary">{task.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-dn-surface rounded-full overflow-hidden">
                <div className="h-full bg-dn-primary transition-all duration-300" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Missing/Active Actions Card */}
        {task.actions?.filter((a) => a.status === 'PENDING_APPROVAL').map((action) => (
          <Card key={action.id} className="p-4 border border-dn-warning/50 bg-dn-warning/10">
            <div className="flex items-start gap-3">
              <Icon name="warning" className="text-dn-warning mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-dn-warning mb-1">{t('agentTasks.actionRequired')}</h4>
                <p className="text-xs text-dn-text-main/80 mb-3">{action.toolArgs || 'Action description not available'}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAction(action.id, true)} loading={approveAction.isPending}>
                    {t('agentTasks.approve')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleAction(action.id, false)} loading={rejectAction.isPending}>
                    {t('agentTasks.reject')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Steps/Logs display */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-dn-text-main pl-1">Execution Steps</h3>
          
          <div className="space-y-2">
            {task.steps?.map((step) => (
              <Card key={step.id} className="p-3 flex flex-col gap-1 border-l-4" style={{
                borderLeftColor: step.type === 'ERROR' ? '#F87171' : 
                                 step.type === 'TOOL_CALL' ? '#60A5FA' : 
                                 step.type === 'TOOL_RESULT' ? '#34D399' : 
                                 step.type === 'THOUGHT' ? '#A78BFA' : '#9CA3AF'
              }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-dn-surface-low text-dn-text-muted font-bold min-w-8 text-center shrink-0">
                    S{step.sequence}
                  </span>
                  <span className="text-xs font-semibold text-dn-text-main">{step.type}</span>
                  {step.toolName && (
                    <span className="text-[10px] font-mono bg-dn-surface/80 px-1.5 py-0.5 rounded ml-auto text-dn-primary/80">
                      {step.toolName}
                    </span>
                  )}
                </div>

                <div className="pl-[2.25rem] mt-1 space-y-1">
                  {(step as any).toolArgs && (
                    <div className="text-xs font-mono text-dn-text-main bg-dn-surface-low p-2 rounded w-full overflow-x-auto whitespace-pre-wrap break-all">
                      <span className="text-[10px] uppercase text-dn-text-muted font-bold mb-1 block">Args:</span>
                      {(step as any).toolArgs}
                    </div>
                  )}
                  {step.content && (
                    <div className={`text-xs p-2 rounded w-full overflow-x-auto whitespace-pre-wrap break-words ${step.type === 'ERROR' ? 'text-dn-error bg-dn-error/10' : 'text-dn-text-muted font-mono bg-dn-surface-low'}`}>
                      {step.content}
                    </div>
                  )}
                </div>
              </Card>
            ))}
            
            {task.steps?.length === 0 && (
              <div className="text-center p-8 text-sm text-dn-text-muted border border-dashed border-dn-border rounded-xl">
                No steps executed yet.
              </div>
            )}
          </div>
        </div>

        {/* Final Response (if present) */}
        {task.currentStep && (
          <Card className="p-4 border-t-4 border-t-dn-success bg-dn-success/10 space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-dn-success">{t('agentTasks.result')}</h3>
            <p className="text-sm text-dn-text-main whitespace-pre-wrap bg-dn-surface p-3 rounded font-mono">
              {task.currentStep}
            </p>
          </Card>
        )}

      </div>
    </div>
  );
}
