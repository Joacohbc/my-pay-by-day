import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAgentTasks } from '@/hooks/useAgentTasks';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { STATUS_COLORS } from '@/components/agent-tasks/statusColors';
import { Routes } from '@/lib/routes';
import { truncate } from '@/lib/format';

export function TasksPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: tasks, isLoading, error } = useAgentTasks();

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allTasks = tasks ?? [];

  return (
    <div className="flex-1 overflow-y-auto w-full py-4">
      {allTasks.length === 0 ? (
        <EmptyState title={t('agentTasks.emptyList')} description="" />
      ) : (
        <div className="px-5 space-y-3">
          {allTasks.map((task) => (
            <Card
              key={task.id}
              className="flex flex-col gap-2 cursor-pointer hover:bg-dn-surface transition-colors"
              onClick={() => navigate(Routes.AGENT_TASK_DETAIL(task.id))}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 ${STATUS_COLORS[task.status] ?? 'text-dn-text-muted bg-dn-surface-low'}`}
                  >
                    <Icon
                      name={task.status === 'RUNNING' ? 'sync' : 'smart_toy'}
                      className={task.status === 'RUNNING' ? 'animate-spin' : ''}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dn-text-main line-clamp-1">
                      {task.title || (task.userInstruction ? truncate(task.userInstruction, 50) : t('agentTasks.title'))}
                    </p>
                    <div className="flex gap-2 items-center mt-1">
                      <Badge size="sm" className={STATUS_COLORS[task.status]}>
                        {t(`agentTasks.statuses.${task.status}`)}
                      </Badge>
                      <span className="text-[10px] text-dn-text-muted">
                        {t(`agentTasks.modes.${task.executionMode}`)}
                      </span>
                    </div>
                  </div>
                </div>

                {task.actions?.some((a) => a.status === 'PENDING_APPROVAL') && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-dn-warning font-medium">
                    <Icon name="priority_high" className="text-[14px]" />
                    {t('agentTasks.actionRequired')}
                  </div>
                )}
              </div>

              {task.currentStep && task.status === 'RUNNING' && (
                <div className="mt-2 text-xs text-dn-text-muted bg-dn-surface-low p-2 rounded-md">
                  {task.progress}% - {task.currentStep === 'Done' ? t('agentTasks.done', 'Completed') : task.currentStep === 'Resuming' ? t('agentTasks.resuming', 'Resuming...') : task.currentStep === 'Analyzing the request' ? t('agentTasks.analyzing', 'Analyzing request...') : task.currentStep}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
