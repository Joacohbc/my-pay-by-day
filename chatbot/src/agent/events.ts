import { EventEmitter } from 'node:events';
import type { AgentTaskActionDto, AgentTaskStatus, AgentTaskStepDto } from './types.js';

export interface AgentTaskEvent {
  taskId: string;
  status: AgentTaskStatus;
  progress: number;
  currentStep?: string;
  newSteps: AgentTaskStepDto[];
  newActions: AgentTaskActionDto[];
}

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function emitTaskEvent(event: AgentTaskEvent): void {
  emitter.emit(event.taskId, event);
}

export function onTaskEvent(taskId: string, listener: (event: AgentTaskEvent) => void): () => void {
  emitter.on(taskId, listener);
  return () => emitter.off(taskId, listener);
}
