export type AgentTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'RETRYING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'INTERRUPTED';

export type AgentTaskExecutionMode = 'AUTONOMOUS' | 'DRAFT_ONLY' | 'READ_ONLY';

export type AgentTaskStepType =
  | 'THOUGHT'
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'MESSAGE'
  | 'ERROR'
  | 'ATTACHMENT_PARSED'
  | 'RETRY';

export type AgentTaskActionStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'FAILED';

export interface AgentTaskStep {
  id: number;
  sequence: number;
  type: AgentTaskStepType;
  content: string;
  toolName?: string;
  stepCreatedAt: string;
}

export interface AgentTaskAction {
  id: number;
  description: string;
  toolName: string;
  toolArgs?: string;
  status: AgentTaskActionStatus;
  createdAt: string;
}

export interface AgentTaskAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  parsed: boolean;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  instruction: string;
  executionMode: AgentTaskExecutionMode;
  status: AgentTaskStatus;
  progress: number;
  currentStep?: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  steps?: AgentTaskStep[];
  actions?: AgentTaskAction[];
  attachments?: AgentTaskAttachment[];
}

export interface AgentTaskSubmitDto {
  instruction: string;
  executionMode: AgentTaskExecutionMode;
  fileIds?: number[];
}

export interface AgentTaskWsPayload {
  taskId: string;
  status: AgentTaskStatus;
  progress: number;
  currentStep?: string;
  newSteps: AgentTaskStep[];
  totalInputTokens: number;
  totalOutputTokens: number;
}
