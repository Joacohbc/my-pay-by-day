import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import {
  useAgentTask,
  useAgentTaskSocket,
  useCancelAgentTask,
  usePauseAgentTask,
  useDeleteAgentTask,
  useResumeAgentTask,
  useApproveAction,
  useRejectAction,
  useSendAgentMessage,
  useUpdateAgentTaskMode,
} from '@/hooks/useAgentTasks';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Routes } from '@/lib/routes';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { AgentTaskStep } from '@/models/agent-tasks';
import type { FileDto } from '@/models';
import { FileCard } from '@/components/files/FileCard';
import { Textarea } from '@/components/ui/Textarea';
import { ChatInput } from '@/components/chat/ChatInput';
import { filesService } from '@/services/files.service';
import { audioService } from '@/services/audio.service';

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
  const sendMessage = useSendAgentMessage();
  const updateMode = useUpdateAgentTaskMode();

  const [feedbacks, setFeedbacks] = useState<Record<number, string>>({});
  const [reply, setReply] = useState('');
  const [draftFiles, setDraftFiles] = useState<FileDto[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;
  if (!task) return <ErrorState message={t('agentTasks.taskNotFound')} />;

  const isRunning = task.status === 'RUNNING' || task.status === 'RETRYING';
  const isPaused = task.status === 'PAUSED';
  const isDone = task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED';
  const hasPendingActions = task.actions?.some((a) => a.status === 'PENDING_APPROVAL');

  const steps = task.steps ?? [];
  const messageSteps = steps.filter((s) => s.type === 'MESSAGE');
  const latestMessage = messageSteps[messageSteps.length - 1];
  const previousMessages = messageSteps.slice(0, -1);
  const plannedSteps = steps.filter((s) => s.type === 'PLANNED_STEP');
  const progressSteps = steps.filter((s) => s.type === 'PROGRESS' || s.type === 'USER');
  const errorSteps = steps.filter((s) => s.type === 'ERROR');
  const isSuccessfullyCompleted = task.status === 'COMPLETED';
  const completedPlanCount = isSuccessfullyCompleted ? plannedSteps.length : progressSteps.length;
  
  const calculatedProgress = plannedSteps.length > 0 
    ? Math.round((Math.min(completedPlanCount, plannedSteps.length) / plannedSteps.length) * 100)
    : Math.min(95, Math.max(task.progress, steps.length * 5)); // Update progress based on any step if no plan

  const displayProgress = isSuccessfullyCompleted ? 100 : Math.max(task.progress, calculatedProgress);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteTask.mutateAsync(id);
      navigate(Routes.AGENT_TASKS);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      await cancelTask.mutateAsync(id);
      setConfirmCancel(false);
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const handlePause = async () => {
    if (!id) return;
    try {
      await pauseTask.mutateAsync(id);
    } catch (err) {
      console.error('Pause failed:', err);
    }
  };

  const handleResume = async () => {
    if (!id) return;
    try {
      await resumeTask.mutateAsync(id);
    } catch (err) {
      console.error('Resume failed:', err);
    }
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  const handleAddFile = (file: FileDto) => {
    setDraftFiles((prev) => [...prev, file]);
  };

  const handleRemoveFile = (id: number) => {
    setDraftFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAudioRecorded = async (audioBlob: Blob) => {
    try {
      const transcriptionResponse = await audioService.transcribeRecordedAudio(audioBlob);
      const transcriptionText = transcriptionResponse.transcription.trim();
      if (transcriptionText) {
        // Upload audio as a file too
        const base64Content = await toBase64(new File([audioBlob], 'recording.webm', { type: audioBlob.type }));
        const uploaded = await filesService.uploadBase64({ 
          fileName: `recording_${new Date().getTime()}.webm`, 
          mimeType: audioBlob.type, 
          base64Content 
        });
        await handleSendReply(transcriptionText, [uploaded.id]);
      }
    } catch (err) {
      console.error('Audio transcription/send failed:', err);
    }
  };

  const handleSendReply = async (explicitMessage?: string, explicitFileIds?: number[]) => {
    const finalMessage = explicitMessage ?? reply.trim();
    const hasFiles = draftFiles.length > 0 || (explicitFileIds && explicitFileIds.length > 0);
    
    if (!id || (!finalMessage && !hasFiles)) return;
    
    try {
      let fileIds: number[] = explicitFileIds ?? [];
      
      if (draftFiles.length > 0) {
        fileIds = [...fileIds, ...draftFiles.map((f) => f.id)];
      }
      
      await sendMessage.mutateAsync({ id, message: finalMessage, fileIds: fileIds.length > 0 ? fileIds : undefined });
      if (!explicitMessage) setReply('');
      setDraftFiles([]);
    } catch (err) {
      console.error('Send message failed:', err);
    }
  };

  const handleAction = async (actionId: number, approve: boolean) => {
    if (!id) return;
    const feedback = feedbacks[actionId];
    if (approve) {
      await approveAction.mutateAsync({ taskId: id, actionId, feedback });
    } else {
      await rejectAction.mutateAsync({ taskId: id, actionId, feedback });
    }
    setFeedbacks((prev) => {
      const next = { ...prev };
      delete next[actionId];
      return next;
    });
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

      <ConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        title={t('common.cancel')}
        message={t('common.confirm')}
        confirmLabel={t('common.confirm')}
        loading={cancelTask.isPending}
      />

      <PageHeader
        title={task.userInstruction || t('agentTasks.title')}
        back={Routes.AGENT_TASKS}
        action={
          <div className="flex items-center gap-2">
            {/* Final state: delete only */}
            {isDone && (
              <Button
                variant="secondary"
                size="sm"
                className="text-dn-error border-dn-error"
                onClick={() => setConfirmDelete(true)}
                loading={deleteTask.isPending}
              >
                <Icon name="delete" className="text-sm" />
                {t('common.delete')}
              </Button>
            )}

            {/* Paused / Interrupted: resume + cancel */}
            {(isPaused || task.status === 'INTERRUPTED') && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={resumeTask.isPending}
                  onClick={handleResume}
                  disabled={hasPendingActions}
                >
                  <Icon name="play_arrow" className="text-sm" />
                  {t('agentTasks.resume')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-dn-error border-dn-error"
                  loading={cancelTask.isPending}
                  onClick={() => setConfirmCancel(true)}
                >
                  <Icon name="close" className="text-sm" />
                  {t('common.cancel')}
                </Button>
              </>
            )}

            {/* Running / Retrying: pause + cancel */}
            {isRunning && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={pauseTask.isPending}
                  onClick={handlePause}
                >
                  <Icon name="pause" className="text-sm" />
                  {t('common.pause')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-dn-error border-dn-error"
                  loading={cancelTask.isPending}
                  onClick={() => setConfirmCancel(true)}
                >
                  <Icon name="close" className="text-sm" />
                  {t('common.cancel')}
                </Button>
              </>
            )}

            {/* Pending: cancel only */}
            {task.status === 'PENDING' && (
              <Button
                variant="secondary"
                size="sm"
                className="text-dn-error border-dn-error"
                loading={cancelTask.isPending}
                onClick={() => setConfirmCancel(true)}
              >
                <Icon name="close" className="text-sm" />
                {t('common.cancel')}
              </Button>
            )}
          </div>
        }
      />

      <div className="px-5 space-y-4">
        {/* Live progress bar */}
        {isRunning && (
          <div className="flex items-center gap-3 p-3 bg-dn-primary/10 rounded-xl border border-dn-primary/30">
            <Icon name="sync" className="animate-spin text-dn-primary text-lg shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-dn-primary truncate leading-none">
                  {task.currentStep || <span className="animate-pulse">{t('agentTasks.initializing')}</span>}
                </span>
                <span className="text-[10px] font-bold text-dn-primary/80 ml-2 shrink-0 leading-none">
                  {displayProgress}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-dn-primary/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-dn-primary transition-all duration-500 ease-out"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Status card */}
        <Card className="p-4 space-y-3 bg-dn-surface-low/50">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold tracking-wider ${STATUS_COLORS[task.status] ?? 'text-dn-text-muted bg-dn-surface-low'}`}>
              {t(`agentTasks.statuses.${task.status}`, task.status)}
            </span>
            <span className="text-xs font-mono text-dn-text-muted">ID: {task.id.slice(0, 8)}…</span>
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-dn-border/20">
            <span className="text-[10px] font-bold uppercase text-dn-text-muted tracking-wider">{t('agentTasks.executionMode')}:</span>
            {!isRunning ? (
              <div className="flex items-center gap-1 group cursor-pointer">
                <select
                  value={task.executionMode}
                  onChange={(e) => updateMode.mutate({ id: task.id, mode: e.target.value })}
                  disabled={updateMode.isPending}
                  className="text-xs font-bold text-dn-primary bg-dn-primary/5 border border-dn-primary/20 rounded px-1.5 py-0.5 cursor-pointer focus:ring-1 focus:ring-dn-primary focus:outline-none hover:bg-dn-primary/10 transition-colors"
                >
                  {['AUTONOMOUS', 'DRAFT_ONLY', 'READ_ONLY', 'DRAFT_CONFIRMATION'].map((m) => (
                    <option key={m} value={m} className="bg-dn-surface text-dn-text-main">
                      {t(`agentTasks.modes.${m}`)}
                    </option>
                  ))}
                </select>
                <Icon name="edit" className="text-[10px] text-dn-primary opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            ) : (
              <span className="text-xs font-bold text-dn-primary">
                {t(`agentTasks.modes.${task.executionMode}`)}
              </span>
            )}
            {updateMode.isPending && <Icon name="sync" className="animate-spin text-[10px] text-dn-primary" />}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-dn-text-main mb-1">{t('agentTasks.instruction')}</h3>
            <div className="text-sm text-dn-text-muted font-mono prose prose-sm prose-invert max-w-none prose-p:my-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {task.userInstruction || t('agentTasks.noInstruction')}
              </ReactMarkdown>
            </div>
          </div>

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-dn-text-main mb-2">{t('agentTasks.attachments')}</h4>
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
          <Card key={action.id} className="p-4 border border-dn-warning/50 bg-dn-warning/10 space-y-4">
            <div className="flex items-start gap-3">
              <Icon name="priority_high" className="text-dn-warning mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-dn-warning mb-1">
                  {action.actionType === 'APPROVAL'
                    ? t('agentTasks.approvalRequired')
                    : action.actionType === 'EXTEND_STEPS'
                      ? t('agentTasks.stepLimitReached')
                      : t('agentTasks.informationRequired')}
                </h4>
                <div className="text-sm text-dn-text-main/90 leading-relaxed prose prose-sm prose-invert max-w-none prose-p:my-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {action.payload || 'Action details not available'}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Textarea
                placeholder={t('agentTasks.feedbackPlaceholder')}
                value={feedbacks[action.id] || ''}
                onChange={(e) => setFeedbacks(prev => ({ ...prev, [action.id]: e.target.value }))}
                className="bg-dn-surface/50 border-dn-warning/30 focus:border-dn-warning/60 min-h-[80px] text-sm"
              />
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleAction(action.id, true)} 
                  loading={approveAction.isPending}
                  className="bg-dn-warning text-dn-surface hover:bg-dn-warning/90 border-none"
                >
                  <Icon name="check" className="text-xs mr-1" />
                  {t('agentTasks.approve', 'Approve & Continue')}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => handleAction(action.id, false)} 
                  loading={rejectAction.isPending}
                  className="border-dn-warning/30 text-dn-warning hover:bg-dn-warning/10"
                >
                  <Icon name="close" className="text-xs mr-1" />
                  {t('agentTasks.reject', 'Reject')}
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {/* Plan checklist */}
        {plannedSteps.length > 0 && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="checklist" className="text-dn-primary text-lg" />
              <h3 className="text-sm font-semibold text-dn-text-main">{t('agentTasks.plan')}</h3>
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
              <h3 className="text-sm font-semibold text-dn-text-main">{t('agentTasks.activity')}</h3>
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
                <p className="text-xs font-semibold text-dn-error mb-1">{t('agentTasks.error')}</p>
                <div className="text-xs text-dn-text-main font-mono prose prose-sm prose-invert max-w-none prose-p:my-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {step.description || step.content || ''}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Previous Results (History) */}
        {previousMessages.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-xs font-medium text-dn-text-muted hover:text-dn-text-secondary transition-colors"
            >
              <Icon name={showHistory ? 'expand_less' : 'expand_more'} />
              <span>{showHistory ? t('agentTasks.showHistory') : t('agentTasks.showPrevious', { count: previousMessages.length })}</span>
            </button>
            
            {showHistory && (
              <div className="space-y-3 opacity-80 pl-2 border-l-2 border-dn-border/30">
                {previousMessages.map((msg, idx) => (
                  <Card key={msg.id} className="p-3 bg-dn-surface-low/50">
                    <div className="flex items-center gap-2 mb-2 opacity-60">
                      <Icon name="history" className="text-xs" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Respuesta #{idx + 1}</span>
                    </div>
                    <div className="prose prose-xs prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Final response or Thinking state */}
        {(latestMessage?.content || isRunning) && (
          <Card className={`p-4 border-t-4 bg-dn-surface space-y-2 ${isRunning ? 'border-t-dn-primary animate-pulse' : 'border-t-dn-success'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon name={isRunning ? 'sync' : 'task_alt'} className={`text-lg ${isRunning ? 'text-dn-primary animate-spin' : 'text-dn-success'}`} />
              <h3 className={`text-sm font-semibold ${isRunning ? 'text-dn-primary' : 'text-dn-success'}`}>
                {isRunning ? t('agentTasks.generatingResponse', 'Thinking...') : t('agentTasks.result')}
              </h3>
            </div>
            {isRunning ? (
              <div className="space-y-2">
                <div className="h-2 bg-dn-border/50 rounded w-3/4" />
                <div className="h-2 bg-dn-border/50 rounded w-1/2" />
              </div>
            ) : (
              <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-table:my-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {latestMessage?.content || ''}
                </ReactMarkdown>
              </div>
            )}
          </Card>
        )}

        {/* Empty state */}
        {steps.length === 0 && !isRunning && (
          <div className="text-center p-8 text-sm text-dn-text-muted border border-dashed border-dn-border rounded-xl">
            {t('agentTasks.noSteps')}
          </div>
        )}

        {/* Reply / continue — reuses ChatInput, hidden only when cancelled */}
        {task.status !== 'CANCELLED' && (
          <ChatInput
            inputContent={reply}
            setInputContent={setReply}
            onSend={() => handleSendReply()}
            onAddFile={handleAddFile}
            onRemoveFile={handleRemoveFile}
            onAudioRecorded={handleAudioRecorded}
            isPending={isRunning || sendMessage.isPending}
            draftFiles={draftFiles}
          />
        )}
      </div>
    </div>
  );
}

function ActivityRow({ step, isLast }: { step: AgentTaskStep; isLast: boolean }) {
  const isUser = step.type === 'USER';
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full ${isUser ? 'bg-dn-primary' : 'bg-dn-success'} mt-1.5 shrink-0`} />
        {!isLast && <div className="w-px flex-1 bg-dn-border/50 my-1" />}
      </div>
      <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-3'}`}>
        <div className={`text-xs ${isUser ? 'font-medium text-dn-primary' : 'text-dn-text-main'} prose prose-sm prose-invert max-w-none prose-p:my-0 prose-p:leading-tight`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {(isUser ? `**[User]** ` : '') + (step.description || '')}
          </ReactMarkdown>
        </div>
        {step.stepCreatedAt && (
          <p className="text-[10px] text-dn-text-muted mt-0.5">{formatTime(step.stepCreatedAt)}</p>
        )}
      </div>
    </div>
  );
}
