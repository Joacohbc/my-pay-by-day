export type AgentTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'RETRYING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'INTERRUPTED';

export type AgentTaskExecutionMode = 'AUTONOMOUS' | 'DRAFT_ONLY' | 'READ_ONLY' | 'DRAFT_CONFIRMATION';
export type AgentTaskActionType = 'APPROVAL' | 'INFORMATION' | 'FEEDBACK' | 'EXTEND_STEPS';

export type AgentTaskStepType =
  | 'MESSAGE'
  | 'USER'
  | 'ERROR'
  | 'RETRY'
  | 'PLANNED_STEP'
  | 'PROGRESS';

export type AgentTaskActionStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export interface AgentTaskStep {
  id: number;
  sequence: number;
  type: AgentTaskStepType;
  description?: string;
  content?: string;
  stepCreatedAt: string;
}

export interface AgentTaskAction {
  id: number;
  taskId: string;
  stepId?: number;
  actionType: AgentTaskActionType;
  payload?: string;
  status: AgentTaskActionStatus;
  createdAt: string;
  resolvedAt?: string;
  resultMessage?: string;
}

export interface AgentTaskAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  parsed: boolean;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  userInstruction: string;
  executionMode: AgentTaskExecutionMode;
  status: AgentTaskStatus;
  progress: number;
  currentStep?: string;
  lang?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  isAssociatedWithChat?: boolean;
  steps?: AgentTaskStep[];
  actions?: AgentTaskAction[];
  attachments?: AgentTaskAttachment[];
}

export interface AgentTaskWsPayload {
  taskId: string;
  status: AgentTaskStatus;
  progress: number;
  currentStep?: string;
  description?: string;
  newSteps: AgentTaskStep[];
  newActions?: AgentTaskAction[];
}
