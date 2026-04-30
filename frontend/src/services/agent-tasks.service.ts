import type { AgentTask, AgentTaskSubmitDto } from '@/models/agent-tasks';
import { api } from '@/services/api';

export const agentTasksService = {
  submit: (dto: AgentTaskSubmitDto) =>
    api.post<AgentTask>('/agent-tasks', dto),

  getAll: (status?: string) => {
    const path = status ? `/agent-tasks?status=${status}` : '/agent-tasks';
    return api.get<AgentTask[]>(path);
  },

  getById: (id: string) =>
    api.get<AgentTask>(`/agent-tasks/${id}`),

  cancel: (id: string) =>
    api.post<AgentTask>(`/agent-tasks/${id}/cancel`),

  pause: (id: string) =>
    api.post<AgentTask>(`/agent-tasks/${id}/pause`),

  resume: (id: string) =>
    api.post<AgentTask>(`/agent-tasks/${id}/resume`),

  delete: (id: string) =>
    api.delete(`/agent-tasks/${id}`),

  sendMessage: (id: string, message: string, fileIds?: number[]) =>
    api.post<AgentTask>(`/agent-tasks/${id}/message`, { message, fileIds }),

  approveAction: (taskId: string, actionId: number, feedback?: string) =>
    api.post<void>(`/agent-tasks/${taskId}/actions/${actionId}/approve`, { feedback }),

  rejectAction: (taskId: string, actionId: number, feedback?: string) =>
    api.post<void>(`/agent-tasks/${taskId}/actions/${actionId}/reject`, { feedback }),
};
