import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAgentTasks, useSubmitAgentTask } from '@/hooks/useAgentTasks';
import { useUploadFile } from '@/hooks/useFiles';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Routes } from '@/lib/routes';
import { truncate } from '@/lib/format';
import type { Base64FileUploadRequestDto, FileDto } from '@/models';

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

export function AgentTasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: tasks, isLoading, error } = useAgentTasks();
  const submitTask = useSubmitAgentTask();
  const uploadFile = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [executionMode, setExecutionMode] = useState<'AUTONOMOUS' | 'DRAFT_ONLY' | 'READ_ONLY'>('AUTONOMOUS');
  const [attachedFiles, setAttachedFiles] = useState<FileDto[]>([]);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={String(error)} />;

  const allTasks = tasks ?? [];

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    await submitTask.mutateAsync({
      instruction,
      executionMode,
      fileIds: attachedFiles.map((f) => f.id)
    });
    setShowModal(false);
    setInstruction('');
    setAttachedFiles([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        const base64Content = result.split(',')[1];
        const dto: Base64FileUploadRequestDto = {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Content,
        };
        const uploaded = await uploadFile.mutateAsync(dto);
        setAttachedFiles((prev) => [...prev, uploaded]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (id: number) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('agentTasks.title')}
        back={Routes.SETTINGS}
        subtitle={t('agentTasks.subtitle')}
        action={
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Icon name="add" className="text-sm" />
            {t('common.new')}
          </Button>
        }
      />

      {allTasks.length === 0 ? (
        <EmptyState
          title={t('agentTasks.emptyList')}
          description=""
          action={
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Icon name="add" className="text-sm" />
              {t('agentTasks.newTask')}
            </Button>
          }
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
                      {task.instruction ? truncate(task.instruction, 50) : t('agentTasks.title')}
                    </p>
                    <div className="flex gap-2 items-center mt-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] ?? 'text-dn-text-muted bg-dn-surface-low'}`}
                      >
                        {task.status}
                      </span>
                      <span className="text-[10px] text-dn-text-muted">{task.executionMode}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {task.currentStep && task.status === 'RUNNING' && (
                <div className="mt-2 text-xs text-dn-text-muted bg-dn-surface-low p-2 rounded-md">
                  {task.progress}% - {task.currentStep}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('agentTasks.newTask')}
      >
        <form onSubmit={handleStart} className="space-y-4 pt-2">
          <div className="space-y-1 mt-4">
            <label className="text-xs font-medium text-dn-text-muted">
              {t('agentTasks.instruction')}
            </label>
            <textarea
              className="w-full bg-dn-surface px-3 py-2 text-sm rounded-lg border border-dn-border focus:border-dn-primary focus:ring-1 focus:ring-dn-primary/50 text-dn-text-main resize-none"
              rows={4}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-dn-text-muted">
              {t('agentTasks.executionMode')}
            </label>
            <select
              className="w-full bg-dn-surface px-3 py-2 text-sm rounded-lg border border-dn-border text-dn-text-main"
              value={executionMode}
              onChange={(e) => setExecutionMode(e.target.value as 'AUTONOMOUS' | 'DRAFT_ONLY' | 'READ_ONLY')}
            >
              <option value="AUTONOMOUS">Autonomous</option>
              <option value="DRAFT_ONLY">Draft Only</option>
              <option value="READ_ONLY">Read Only</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-dn-text-muted">
              {t('files.title') || 'Attachments'}
            </label>
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-1.5 bg-dn-surface px-2 py-1 rounded-md text-xs border border-dn-border text-dn-text-muted">
                  <Icon name={file.mimeType?.startsWith('image/') ? 'image' : 'description'} className="text-sm" />
                  <span className="max-w-[120px] truncate">{file.fileName}</span>
                  <button type="button" onClick={() => removeFile(file.id)} className="text-dn-text-muted hover:text-dn-error">
                    <Icon name="close" className="text-sm" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadFile.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-dn-surface border border-dn-border border-dashed text-dn-text-muted hover:bg-dn-surface-low hover:text-dn-primary transition-colors"
              >
                {uploadFile.isPending ? <Icon name="sync" className="animate-spin text-sm" /> : <Icon name="add" className="text-sm" />}
                {t('common.add')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowModal(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={submitTask.isPending || !instruction.trim()}>
              {submitTask.isPending ? <Icon name="sync" className="animate-spin" /> : null}
              {t('agentTasks.start')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
