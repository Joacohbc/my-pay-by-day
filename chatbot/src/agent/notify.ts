import { emitTaskEvent } from './events.js';
import { agentStore } from './store.js';
import type { AgentActionType, AgentStepType, AgentTaskActionDto, AgentTaskStatus, AgentTaskStepDto } from './types.js';

function currentProgress(taskId: string): { status: AgentTaskStatus; progress: number; currentStep?: string } {
  const row = agentStore.rawTask(taskId);
  return {
    status: row?.status ?? 'RUNNING',
    progress: row?.progress ?? 0,
    currentStep: row?.current_step ?? undefined,
  };
}

/** Persists a step and broadcasts it to any SSE listeners. */
export function recordStep(
  taskId: string,
  step: { type: AgentStepType; description?: string; content?: string },
): AgentTaskStepDto {
  const saved = agentStore.addStep(taskId, step);
  const state = currentProgress(taskId);
  emitTaskEvent({ taskId, ...state, newSteps: [saved], newActions: [] });
  return saved;
}

/** Persists an action and broadcasts it. */
export function recordAction(
  taskId: string,
  action: { stepId?: number; actionType: AgentActionType; payload?: string },
): AgentTaskActionDto {
  const saved = agentStore.addAction(taskId, action);
  const state = currentProgress(taskId);
  emitTaskEvent({ taskId, ...state, newSteps: [], newActions: [saved] });
  return saved;
}

/** Updates task status/progress and broadcasts it. */
export function updateStatus(
  taskId: string,
  status: AgentTaskStatus,
  progress?: number,
  currentStep?: string,
): void {
  agentStore.setStatus(taskId, status, progress, currentStep);
  const state = currentProgress(taskId);
  emitTaskEvent({ taskId, ...state, newSteps: [], newActions: [] });
}

/** Broadcasts a resolved action update (status change) without creating a new one. */
export function broadcastAction(taskId: string, action: AgentTaskActionDto): void {
  const state = currentProgress(taskId);
  emitTaskEvent({ taskId, ...state, newSteps: [], newActions: [action] });
}
