import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  useAgentTask,
  useAgentTaskSocket,
  useCancelAgentTask,
  usePauseAgentTask,
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
import type { AgentTaskStep } from '@/models/agent-tasks';
import { FileCard } from '@/components/files/FileCard';

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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function StepIcon({ done, error }: { done: boolean; error?: boolean }) {
  if (error) return <Icon name="cancel" className="text-dn-error text-base shrink-0" />;
  if (done) return <Icon name="check_circle" className="text-dn-success text-base shrink-0" />;
  return <Icon name="radio_button_unchecked" className="text-dn-text-muted text-base shrink-0" />;
}

export function AgentTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: task, isLoading, error } = useAgentTask(id || '');
  useAgentTaskSocket(id || null);

  const cancelTask = useCancelAgentTask();
  const pauseTask = usePauseAgentTask();
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

  const steps = task.steps ?? [];
  const plannedSteps = steps.filter((s) => s.type === 'PLANNED_STEP');
  const progressSteps = steps.filter((s) => s.type === 'PROGRESS');
  const errorSteps = steps.filter((s) => s.type === 'ERROR');
  const finalStep = steps.find((s) => s.type === 'MESSAGE');
  const completedPlanCount = progressSteps.length;
  
  const calculatedProgress = plannedSteps.length > 0 
    ? Math.round((Math.min(completedPlanCount, plannedSteps.length) / plannedSteps.length) * 100)
    : Math.min(95, Math.max(task.progress, steps.length * 5)); // Update progress based on any step if no plan

  const displayProgress = isDone ? 100 : Math.max(task.progress, calculatedProgress);

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
        title={task.userInstruction || t('agentTasks.title')}
        back={Routes.AGENT_TASKS}
        action={
          <div className="flex items-center gap-2">
            {!isDone && !isPaused && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={pauseTask.isPending}
                  disabled={task.status === 'CANCELLED'}
                  onClick={() => pauseTask.mutate(task.id)}
                >
                  <Icon name="pause" className="text-sm" />
                  {t('common.pause', 'Pause')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-dn-error border-dn-error"
                  loading={cancelTask.isPending}
                  disabled={task.status === 'CANCELLED'}
                  onClick={() => cancelTask.mutate(task.id)}
                >
                  <Icon name="close" className="text-sm" />
                </Button>
              </>
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
        {/* Live progress bar */}
        {isRunning && (
          <div className="flex items-center gap-3 p-3 bg-dn-primary/10 rounded-xl border border-dn-primary/30">
            <Icon name="sync" className="animate-spin text-dn-primary text-xl shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-medium text-dn-primary truncate">
                  {task.currentStep || <span className="animate-pulse">Initializing...</span>}
                </span>
                <span className="text-xs font-bold text-dn-primary ml-2 shrink-0">{displayProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-dn-surface rounded-full overflow-hidden">
                <div className="h-full bg-dn-primary transition-all duration-500" style={{ width: `${displayProgress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Status card */}
        <Card className="p-4 space-y-3 bg-dn-surface-low/50">
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLORS[task.status] ?? 'text-dn-text-muted bg-dn-surface-low'}`}>
              {task.status}
            </span>
            <span className="text-xs font-mono text-dn-text-muted">ID: {task.id.slice(0, 8)}…</span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-dn-text-main mb-1">{t('agentTasks.instruction')}</h3>
            <p className="text-sm text-dn-text-muted whitespace-pre-wrap font-mono p-2 bg-dn-surface rounded-md border border-dn-border/50">
              {task.userInstruction || <span className="italic opacity-50">Sin instrucción explícita</span>}
            </p>
          </div>

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="mt-4 border-t border-dn-border pt-3">
              <h4 className="text-sm font-semibold text-dn-text-main mb-2">Adjuntos</h4>
              <div className="flex flex-col gap-2">
                {task.attachments.map((att) => (
                  <FileCard key={att.id} file={{ ...att, size: att.sizeBytes || 0 }} />
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Pending actions */}
        {task.actions?.filter((a) => a.status === 'PENDING_APPROVAL').map((action) => (
          <Card key={action.id} className="p-4 border border-dn-warning/50 bg-dn-warning/10">
            <div className="flex items-start gap-3">
              <Icon name="warning" className="text-dn-warning mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-dn-warning mb-1">{t('agentTasks.actionRequired')}</h4>
                <p className="text-xs text-dn-text-main/80 mb-3">{action.description || action.toolArgs || 'Action description not available'}</p>
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

        {/* Plan checklist */}
        {plannedSteps.length > 0 && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="checklist" className="text-dn-primary text-lg" />
              <h3 className="text-sm font-semibold text-dn-text-main">Plan</h3>
              <span className="ml-auto text-xs text-dn-text-muted">
                {Math.min(completedPlanCount, plannedSteps.length)}/{plannedSteps.length}
              </span>
            </div>
            <div className="space-y-2">
              {plannedSteps.map((step, i) => {
                const done = i < completedPlanCount;
                return (
                  <div key={step.id} className={`flex items-start gap-2.5 text-sm ${done ? 'text-dn-text-muted' : 'text-dn-text-main'}`}>
                    <StepIcon done={done} />
                    <span className={done ? 'line-through' : ''}>{step.description}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Activity timeline */}
        {progressSteps.length > 0 && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="history" className="text-dn-primary text-lg" />
              <h3 className="text-sm font-semibold text-dn-text-main">Activity</h3>
            </div>
            <div className="space-y-0">
              {progressSteps.map((step, i) => (
                <ActivityRow key={step.id} step={step} isLast={i === progressSteps.length - 1} />
              ))}
            </div>
          </Card>
        )}

        {/* Error steps */}
        {errorSteps.map((step) => (
          <Card key={step.id} className="p-4 border border-dn-error/40 bg-dn-error/5">
            <div className="flex items-start gap-2">
              <Icon name="error" className="text-dn-error mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-dn-error mb-1">Error</p>
                <p className="text-xs text-dn-text-main whitespace-pre-wrap font-mono">
                  {step.description || step.content}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {/* Final response */}
        {finalStep?.content && (
          <Card className="p-4 border-t-4 border-t-dn-success bg-dn-surface space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="task_alt" className="text-dn-success text-lg" />
              <h3 className="text-sm font-semibold text-dn-success">{t('agentTasks.result')}</h3>
            </div>
            <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-table:my-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {finalStep.content}
              </ReactMarkdown>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {steps.length === 0 && !isRunning && (
          <div className="text-center p-8 text-sm text-dn-text-muted border border-dashed border-dn-border rounded-xl">
            No steps yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ step, isLast }: { step: AgentTaskStep; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-dn-success mt-1.5 shrink-0" />
        {!isLast && <div className="w-px flex-1 bg-dn-border/50 my-1" />}
      </div>
      <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-3'}`}>
        <p className="text-xs text-dn-text-main">{step.description}</p>
        {step.stepCreatedAt && (
          <p className="text-[10px] text-dn-text-muted mt-0.5">{formatTime(step.stepCreatedAt)}</p>
        )}
      </div>
    </div>
  );
}
