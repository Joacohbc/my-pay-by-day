import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAgentTask, useAgentTaskSocket, useApproveAction, useRejectAction } from '@/hooks/useAgentTasks';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { STATUS_COLORS } from '@/components/agent-tasks/statusColors';
import { Routes } from '@/lib/routes';
import { truncate } from '@/lib/format';
import type { AgentTaskStatus } from '@/models/agent-tasks';

const TERMINAL_STATUSES: ReadonlySet<AgentTaskStatus> = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

interface InlineTaskCardProps {
  taskId: string;
}

export function InlineTaskCard({ taskId }: InlineTaskCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: task } = useAgentTask(taskId);
  const isTerminal = task ? TERMINAL_STATUSES.has(task.status) : false;
  useAgentTaskSocket(isTerminal ? null : taskId);
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  if (!task) return null;

  const pendingAction = task.actions?.find((a) => a.status === 'PENDING_APPROVAL');

  return (
    <Card
      className="flex flex-col gap-2 cursor-pointer hover:bg-dn-surface transition-colors mt-2"
      onClick={() => navigate(Routes.AGENT_TASK_DETAIL(task.id))}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 ${STATUS_COLORS[task.status] ?? 'text-dn-text-muted bg-dn-surface-low'}`}
        >
          <Icon
            name={task.status === 'RUNNING' ? 'sync' : 'smart_toy'}
            className={task.status === 'RUNNING' ? 'animate-spin' : ''}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-dn-text-main line-clamp-1">
            {truncate(task.userInstruction, 60)}
          </p>
          <Badge size="sm" className={STATUS_COLORS[task.status]}>
            {t(`agentTasks.statuses.${task.status}`)}
          </Badge>
        </div>
      </div>

      {task.currentStep && task.status === 'RUNNING' && (
        <div className="text-xs text-dn-text-muted bg-dn-surface-low p-2 rounded-md">
          {task.progress}% - {task.currentStep}
        </div>
      )}

      {pendingAction && (
        <div
          className="flex flex-col gap-2 text-xs text-dn-warning bg-dn-warning/10 p-2 rounded-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <Icon name="priority_high" className="text-[14px]" />
            {pendingAction.actionType === 'EXTEND_STEPS'
              ? t('agentTasks.stepLimitReached')
              : t('agentTasks.actionRequired')}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => approveAction.mutate({ taskId: task.id, actionId: pendingAction.id })}
              disabled={approveAction.isPending || rejectAction.isPending}
            >
              {t('agentTasks.approve')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => rejectAction.mutate({ taskId: task.id, actionId: pendingAction.id })}
              disabled={approveAction.isPending || rejectAction.isPending}
            >
              {t('agentTasks.reject')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
