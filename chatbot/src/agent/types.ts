export type AgentTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'RETRYING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'INTERRUPTED';

export type AgentExecutionMode = 'AUTONOMOUS' | 'DRAFT_ONLY' | 'READ_ONLY' | 'DRAFT_CONFIRMATION';
export type AgentStepType = 'MESSAGE' | 'USER' | 'ERROR' | 'RETRY' | 'PLANNED_STEP' | 'PROGRESS';
export type AgentActionType = 'APPROVAL' | 'INFORMATION' | 'FEEDBACK' | 'EXTEND_STEPS';
export type AgentActionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export const TERMINAL_STATUSES: ReadonlySet<AgentTaskStatus> = new Set([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export interface AgentTaskStepDto {
  id: number;
  sequence: number;
  type: AgentStepType;
  description?: string;
  content?: string;
  stepCreatedAt: string;
}

export interface AgentTaskActionDto {
  id: number;
  taskId: string;
  stepId?: number;
  actionType: AgentActionType;
  payload?: string;
  status: AgentActionStatus;
  createdAt: string;
  resolvedAt?: string;
  resultMessage?: string;
}

export interface AgentTaskAttachmentDto {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  parsed: boolean;
  createdAt: string;
}

export interface AgentTaskDto {
  id: string;
  userInstruction: string;
  executionMode: AgentExecutionMode;
  status: AgentTaskStatus;
  progress: number;
  currentStep?: string;
  lang?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  isAssociatedWithChat?: boolean;
  steps?: AgentTaskStepDto[];
  actions?: AgentTaskActionDto[];
  attachments?: AgentTaskAttachmentDto[];
}
