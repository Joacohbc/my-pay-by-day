import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAgentTasks, useSubmitAgentTask } from '@/hooks/useAgentTasks';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { FileUploader } from '@/components/ui/FileUploader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Badge } from '@/components/ui/Badge';
import { ChatInput } from '@/components/chat/ChatInput';
import { audioService } from '@/services/audio.service';
import { Routes } from '@/lib/routes';
import { truncate } from '@/lib/format';
import type { FileDto } from '@/models';

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

interface AgentTasksViewProps {
  showNewTaskModal: boolean;
  onCloseModal: () => void;
}

export function AgentTasksView({ showNewTaskModal, onCloseModal }: AgentTasksViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: tasks, isLoading, error } = useAgentTasks();
  const submitTask = useSubmitAgentTask();

  const [instruction, setInstruction] = useState('');
  const [executionMode, setExecutionMode] = useState<'AUTONOMOUS' | 'DRAFT_ONLY' | 'READ_ONLY' | 'DRAFT_CONFIRMATION'>('AUTONOMOUS');
  const [attachedFiles, setAttachedFiles] = useState<FileDto[]>([]);
  const [quickFiles, setQuickFiles] = useState<FileDto[]>([]);
  const [isQuickProcessing, setIsQuickProcessing] = useState(false);

  const handleStart = useCallback(async () => {
    if (!instruction.trim() && attachedFiles.length === 0) return;
    await submitTask.mutateAsync({
      instruction,
      executionMode,
      fileIds: attachedFiles.map((f) => f.id)
    });
    onCloseModal();
    setInstruction('');
    setAttachedFiles([]);
  }, [instruction, attachedFiles, executionMode, submitTask, onCloseModal]);

  const handleAudioRecorded = useCallback(async (blob: Blob) => {
    const response = await audioService.transcribeRecordedAudio(blob);
    setInstruction((prev) => (prev ? prev + ' ' + response.transcription : response.transcription));
  }, []);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allTasks = tasks ?? [];

  const handleQuickProcess = async () => {
    if (quickFiles.length === 0) return;
    setIsQuickProcessing(true);
    try {
      await submitTask.mutateAsync({
        instruction: t('agentTasks.quickProcess.instruction'),
        executionMode: 'AUTONOMOUS',
        fileIds: quickFiles.map((f) => f.id),
      });
      setQuickFiles([]);
    } catch (err) {
      console.error('Quick process failed:', err);
    } finally {
      setIsQuickProcessing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto w-full py-4">
      <div className="px-5 mb-6">
        <Card className="bg-dn-primary/5 border-dn-primary/20 p-5 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-dn-primary/5 rounded-full blur-2xl" />
          <div className="relative z-10 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-dn-primary flex items-center gap-2">
                <Icon name="bolt" className="text-dn-primary" />
                {t('agentTasks.quickProcess.title')}
              </h3>
              <p className="text-xs text-dn-text-muted mt-1 leading-relaxed">
                {t('agentTasks.quickProcess.subtitle')}
              </p>
            </div>

            <FileUploader
              files={quickFiles}
              onAddFile={(file) => setQuickFiles((prev) => [...prev, file])}
              onRemoveFile={(id) => setQuickFiles((prev) => prev.filter((f) => f.id !== id))}
            />

            {quickFiles.length > 0 && (
              <Button
                size="sm"
                className="w-full shadow-lg shadow-dn-primary/20"
                onClick={handleQuickProcess}
                disabled={isQuickProcessing}
              >
                {isQuickProcessing ? (
                  <Icon name="sync" className="animate-spin" />
                ) : (
                  <Icon name="auto_awesome" />
                )}
                {t('agentTasks.quickProcess.button')} ({quickFiles.length})
              </Button>
            )}
          </div>
        </Card>
      </div>

      {allTasks.length === 0 ? (
        <EmptyState
          title={t('agentTasks.emptyList')}
          description=""
        />
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
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 ${STATUS_COLORS[task.status] ?? 'text-dn-text-muted bg-dn-surface-low'}`}>
                    <Icon name={task.status === 'RUNNING' ? 'sync' : 'smart_toy'} className={task.status === 'RUNNING' ? 'animate-spin' : ''} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dn-text-main line-clamp-1">
                      {task.userInstruction ? truncate(task.userInstruction, 50) : t('agentTasks.title')}
                    </p>
                    <div className="flex gap-2 items-center mt-1">
                      <Badge
                        size="sm"
                        className={STATUS_COLORS[task.status]}
                      >
                        {t(`agentTasks.statuses.${task.status}`)}
                      </Badge>
                      <span className="text-[10px] text-dn-text-muted">
                        {t(`agentTasks.modes.${task.executionMode}`)}
                      </span>
                    </div>
                  </div>
                </div>

                {task.actions?.some(a => a.status === 'PENDING_APPROVAL') && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-dn-warning font-medium">
                    <Icon name="priority_high" className="text-[14px]" />
                    {t('agentTasks.actionRequired')}
                  </div>
                )}
              </div>
              
              {task.currentStep && task.status === 'RUNNING' && (
                <div className="mt-2 text-xs text-dn-text-muted bg-dn-surface-low p-2 rounded-md">
                  {task.progress}% - {task.currentStep || t('agentTasks.initializing')}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showNewTaskModal}
        onClose={onCloseModal}
        title={t('agentTasks.newTask')}
      >
        <div className="space-y-6 pt-4 px-1">
          <SearchableSelect
            label={t('agentTasks.executionMode')}
            value={executionMode}
            onChange={(val) => setExecutionMode(val as 'AUTONOMOUS' | 'DRAFT_ONLY' | 'READ_ONLY' | 'DRAFT_CONFIRMATION')}
            options={[
              { value: 'AUTONOMOUS', label: t('agentTasks.modes.AUTONOMOUS') },
              { value: 'DRAFT_ONLY', label: t('agentTasks.modes.DRAFT_ONLY') },
              { value: 'READ_ONLY', label: t('agentTasks.modes.READ_ONLY') },
              { value: 'DRAFT_CONFIRMATION', label: t('agentTasks.modes.DRAFT_CONFIRMATION') },
            ]}
          />

          <div className="pt-2">
            <ChatInput
              inputContent={instruction}
              setInputContent={setInstruction}
              onSend={handleStart}
              draftFiles={attachedFiles}
              onAddFile={(file) => setAttachedFiles((prev) => [...prev, file])}
              onRemoveFile={(id) => setAttachedFiles((prev) => prev.filter((f) => f.id !== id))}
              isPending={submitTask.isPending}
              onAudioRecorded={handleAudioRecorded}
              placeholder={t('agentTasks.placeholderInstruction')}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
