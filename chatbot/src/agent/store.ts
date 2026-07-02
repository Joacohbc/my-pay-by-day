import { randomUUID } from 'node:crypto';
import { db, nowIso } from '@/db/index.js';
import type {
  AgentActionStatus,
  AgentActionType,
  AgentExecutionMode,
  AgentStepType,
  AgentTaskActionDto,
  AgentTaskAttachmentDto,
  AgentTaskDto,
  AgentTaskStatus,
  AgentTaskStepDto,
} from '@/agent/types.js';

interface TaskRow {
  id: string;
  user_instruction: string;
  execution_mode: AgentExecutionMode;
  status: AgentTaskStatus;
  progress: number;
  current_step: string | null;
  lang: string | null;
  timezone: string | null;
  cancel_requested: number;
  title: string | null;
  step_budget: number | null;
  created_at: string;
  updated_at: string;
}

interface StepRow {
  id: number;
  sequence: number;
  type: AgentStepType;
  description: string | null;
  content: string | null;
  created_at: string;
}

interface ActionRow {
  id: number;
  task_id: string;
  step_id: number | null;
  action_type: AgentActionType;
  payload: string | null;
  status: AgentActionStatus;
  result_message: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface AttachmentRow {
  id: number;
  file_name: string;
  mime_type: string;
  kind: string;
  size_bytes: number | null;
  parsed: number;
  created_at: string;
}

export interface AttachmentContent extends AttachmentRow {
  data: Uint8Array | null;
}

function mapTask(row: TaskRow): AgentTaskDto {
  const match = db()
    .prepare('SELECT COUNT(*) as count FROM conversation_message WHERE text LIKE ?')
    .get(`%[Background Task: ${row.id}]%`) as { count: number };

  return {
    id: row.id,
    userInstruction: row.user_instruction,
    executionMode: row.execution_mode,
    status: row.status,
    progress: row.progress,
    currentStep: row.current_step ?? undefined,
    lang: row.lang ?? undefined,
    title: row.title ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isAssociatedWithChat: match.count > 0,
  };
}

function mapStep(row: StepRow): AgentTaskStepDto {
  return {
    id: row.id,
    sequence: row.sequence,
    type: row.type,
    description: row.description ?? undefined,
    content: row.content ?? undefined,
    stepCreatedAt: row.created_at,
  };
}

function mapAction(row: ActionRow): AgentTaskActionDto {
  return {
    id: row.id,
    taskId: row.task_id,
    stepId: row.step_id ?? undefined,
    actionType: row.action_type,
    payload: row.payload ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    resultMessage: row.result_message ?? undefined,
  };
}

function mapAttachment(row: AttachmentRow): AgentTaskAttachmentDto {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes ?? undefined,
    parsed: row.parsed === 1,
    createdAt: row.created_at,
  };
}

export const agentStore = {
  create(input: {
    instruction: string;
    executionMode: AgentExecutionMode;
    lang: string;
    timezone: string;
    title?: string;
  }): AgentTaskDto {
    const id = randomUUID();
    const now = nowIso();
    db()
      .prepare(
        `INSERT INTO agent_task (id, user_instruction, execution_mode, status, progress, lang, timezone, title, created_at, updated_at)
         VALUES (?, ?, ?, 'PENDING', 0, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.instruction, input.executionMode, input.lang, input.timezone, input.title ?? null, now, now);
    return this.findById(id)!.task;
  },

  rawTask(id: string): TaskRow | undefined {
    return db().prepare('SELECT * FROM agent_task WHERE id = ?').get(id) as unknown as TaskRow | undefined;
  },

  findById(id: string): { task: AgentTaskDto } | undefined {
    const row = this.rawTask(id);
    if (!row) return undefined;
    return { task: mapTask(row) };
  },

  detail(id: string): AgentTaskDto | undefined {
    const row = this.rawTask(id);
    if (!row) return undefined;
    const task = mapTask(row);
    task.steps = this.steps(id);
    task.actions = this.actions(id);
    task.attachments = this.attachments(id);
    return task;
  },

  list(status?: AgentTaskStatus): AgentTaskDto[] {
    const rows = (
      status
        ? db().prepare('SELECT * FROM agent_task WHERE status = ? ORDER BY created_at DESC').all(status)
        : db().prepare('SELECT * FROM agent_task ORDER BY created_at DESC').all()
    ) as unknown as TaskRow[];
    return rows.map(mapTask);
  },

  steps(taskId: string): AgentTaskStepDto[] {
    const rows = db()
      .prepare('SELECT * FROM agent_task_step WHERE task_id = ? ORDER BY sequence ASC')
      .all(taskId) as unknown as StepRow[];
    return rows.map(mapStep);
  },

  actions(taskId: string): AgentTaskActionDto[] {
    const rows = db()
      .prepare('SELECT * FROM agent_task_action WHERE task_id = ? ORDER BY id ASC')
      .all(taskId) as unknown as ActionRow[];
    return rows.map(mapAction);
  },

  attachments(taskId: string): AgentTaskAttachmentDto[] {
    const rows = db()
      .prepare('SELECT id, file_name, mime_type, kind, size_bytes, parsed, created_at FROM agent_task_attachment WHERE task_id = ? ORDER BY id ASC')
      .all(taskId) as unknown as AttachmentRow[];
    return rows.map(mapAttachment);
  },

  attachmentContents(taskId: string): AttachmentContent[] {
    return db()
      .prepare('SELECT * FROM agent_task_attachment WHERE task_id = ? ORDER BY id ASC')
      .all(taskId) as unknown as AttachmentContent[];
  },

  saveAttachment(taskId: string, att: { fileName: string; mimeType: string; kind: string; data: Uint8Array }): void {
    db()
      .prepare(
        `INSERT INTO agent_task_attachment (task_id, file_name, mime_type, kind, size_bytes, data, parsed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      )
      .run(taskId, att.fileName, att.mimeType, att.kind, att.data.byteLength, att.data, nowIso());
  },

  setStatus(id: string, status: AgentTaskStatus, progress?: number, currentStep?: string): void {
    const current = this.rawTask(id);
    if (!current) return;
    db()
      .prepare('UPDATE agent_task SET status = ?, progress = ?, current_step = ?, updated_at = ? WHERE id = ?')
      .run(status, progress ?? current.progress, currentStep ?? current.current_step, nowIso(), id);
  },

  setExecutionMode(id: string, mode: AgentExecutionMode): void {
    db().prepare('UPDATE agent_task SET execution_mode = ?, updated_at = ? WHERE id = ?').run(mode, nowIso(), id);
  },

  setCancelRequested(id: string, requested: boolean): void {
    db().prepare('UPDATE agent_task SET cancel_requested = ?, updated_at = ? WHERE id = ?').run(requested ? 1 : 0, nowIso(), id);
  },

  setStepBudget(id: string, budget: number): void {
    db().prepare('UPDATE agent_task SET step_budget = ?, updated_at = ? WHERE id = ?').run(budget, nowIso(), id);
  },

  isCancelRequested(id: string): boolean {
    return (this.rawTask(id)?.cancel_requested ?? 0) === 1;
  },

  status(id: string): AgentTaskStatus | undefined {
    return this.rawTask(id)?.status;
  },

  addStep(taskId: string, step: { type: AgentStepType; description?: string; content?: string }): AgentTaskStepDto {
    const next = db()
      .prepare('SELECT COALESCE(MAX(sequence), -1) + 1 AS next FROM agent_task_step WHERE task_id = ?')
      .get(taskId) as { next: number };
    const now = nowIso();
    const info = db()
      .prepare('INSERT INTO agent_task_step (task_id, sequence, type, description, content, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(taskId, next.next, step.type, step.description ?? null, step.content ?? null, now);
    return { id: Number(info.lastInsertRowid), sequence: next.next, type: step.type, description: step.description, content: step.content, stepCreatedAt: now };
  },

  addAction(taskId: string, action: { stepId?: number; actionType: AgentActionType; payload?: string }): AgentTaskActionDto {
    const now = nowIso();
    const info = db()
      .prepare('INSERT INTO agent_task_action (task_id, step_id, action_type, payload, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(taskId, action.stepId ?? null, action.actionType, action.payload ?? null, 'PENDING_APPROVAL', now);
    return { id: Number(info.lastInsertRowid), taskId, stepId: action.stepId, actionType: action.actionType, payload: action.payload, status: 'PENDING_APPROVAL', createdAt: now };
  },

  getAction(actionId: number): AgentTaskActionDto | undefined {
    const row = db().prepare('SELECT * FROM agent_task_action WHERE id = ?').get(actionId) as unknown as ActionRow | undefined;
    return row ? mapAction(row) : undefined;
  },

  resolveAction(actionId: number, status: AgentActionStatus, resultMessage?: string): void {
    db()
      .prepare('UPDATE agent_task_action SET status = ?, result_message = ?, resolved_at = ? WHERE id = ?')
      .run(status, resultMessage ?? null, nowIso(), actionId);
  },

  delete(id: string): void {
    db().prepare('DELETE FROM agent_task_step WHERE task_id = ?').run(id);
    db().prepare('DELETE FROM agent_task_action WHERE task_id = ?').run(id);
    db().prepare('DELETE FROM agent_task_attachment WHERE task_id = ?').run(id);
    db().prepare('DELETE FROM agent_task WHERE id = ?').run(id);
  },
};
