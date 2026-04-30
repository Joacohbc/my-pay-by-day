import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentTasksService } from '@/services/agent-tasks.service';
import { BASE_URL } from '@/services/api';
import type { AgentTaskSubmitDto, AgentTaskWsPayload, AgentTask } from '@/models/agent-tasks';

export const agentTaskKeys = {
  all: ['agent-tasks'] as const,
  lists: () => [...agentTaskKeys.all, 'list'] as const,
  list: (status?: string) => [...agentTaskKeys.lists(), { status }] as const,
  detail: (id: string) => [...agentTaskKeys.all, 'detail', id] as const,
};

export function useAgentTasks(status?: string) {
  return useQuery({
    queryKey: agentTaskKeys.list(status),
    queryFn: () => agentTasksService.getAll(status),
    refetchInterval: 5000,
  });
}

export function useAgentTask(id: string) {
  return useQuery({
    queryKey: agentTaskKeys.detail(id),
    queryFn: () => agentTasksService.getById(id),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useSubmitAgentTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AgentTaskSubmitDto) => agentTasksService.submit(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.lists() });
    },
  });
}

export function useCancelAgentTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentTasksService.cancel(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(id) });
    },
  });
}

export function usePauseAgentTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentTasksService.pause(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(id) });
    },
  });
}

export function useResumeAgentTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentTasksService.resume(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(id) });
    },
  });
}

export function useDeleteAgentTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentTasksService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.lists() });
    },
  });
}

export function useUpdateAgentTaskMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: string }) =>
      agentTasksService.updateMode(id, mode),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(id) });
    },
  });
}

export function useSendAgentMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message, fileIds }: { id: string; message: string; fileIds?: number[] }) =>
      agentTasksService.sendMessage(id, message, fileIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(id) });
    },
  });
}

export function useApproveAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, actionId, feedback }: { taskId: string; actionId: number; feedback?: string }) =>
      agentTasksService.approveAction(taskId, actionId, feedback),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(taskId) });
    },
  });
}

export function useRejectAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, actionId, feedback }: { taskId: string; actionId: number; feedback?: string }) =>
      agentTasksService.rejectAction(taskId, actionId, feedback),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(taskId) });
    },
  });
}

/** Opens a WebSocket for the given task ID and merges live updates into the query cache. */
export function useAgentTaskSocket(taskId: string | null) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!taskId) return;

    let wsUrl: string;
    if (BASE_URL.startsWith('http')) {
      const origin = new URL(BASE_URL).origin;
      wsUrl = `${origin.replace(/^http/, 'ws')}/ws/agent-tasks/${taskId}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/agent-tasks/${taskId}`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const raw = JSON.parse(ev.data);

        // On connect ack, invalidate to get full fresh state from HTTP
        if (raw.type === 'connected') {
          queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(taskId) });
          return;
        }

        const payload: AgentTaskWsPayload = raw;
        if (payload.taskId !== taskId) return;

        queryClient.setQueryData<AgentTask>(
          agentTaskKeys.detail(taskId),
          (prev) => {
            if (!prev) {
              // HTTP not loaded yet — invalidate so it re-fetches with latest state
              queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(taskId) });
              return prev;
            }
            return {
              ...prev,
              status: payload.status,
              progress: payload.progress,
              currentStep: payload.currentStep ?? prev.currentStep,
              steps: (() => {
                  const existingIds = new Set(prev.steps?.map((s) => s.id) ?? []);
                  const fresh = (payload.newSteps ?? []).filter((s) => !existingIds.has(s.id));
                  return [...(prev.steps ?? []), ...fresh];
                })(),
              actions: (() => {
                  const actionMap = new Map(prev.actions?.map((a) => [a.id, a]) ?? []);
                  (payload.newActions ?? []).forEach((a) => actionMap.set(a.id, a));
                  return Array.from(actionMap.values());
                })(),
            };
          }
        );

        queryClient.setQueryData<AgentTask[]>(
          agentTaskKeys.list(),
          (prev) =>
            prev?.map((t) =>
              t.id === taskId
                ? { ...t, status: payload.status, progress: payload.progress, currentStep: payload.currentStep }
                : t
            )
        );
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => ws.close();

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [taskId, queryClient]);
}
