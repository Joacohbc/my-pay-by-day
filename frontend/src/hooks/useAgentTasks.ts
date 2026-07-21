import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentTasksService } from '@/services/agent-tasks.service';
import { BASE_URL } from '@/services/api';
import type { AgentTaskWsPayload, AgentTask, AgentTaskStatus } from '@/models/agent-tasks';
import { agentTaskKeys } from '@/lib/queryKeys';
import { invalidateDomains, BROAD_FINANCE_DOMAINS } from '@/lib/cacheInvalidation';
import { logger } from '@/lib/logger';

const TERMINAL_STATUSES = new Set<AgentTaskStatus>([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'INTERRUPTED',
]);

export function useAgentTasks(status?: string) {
  const queryClient = useQueryClient();
  const previousStatusesRef = useRef<Map<string, AgentTaskStatus> | null>(null);

  const query = useQuery({
    queryKey: agentTaskKeys.list(status),
    queryFn: () => agentTasksService.getAll(status),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const tasks = query.data;
    if (!tasks) return;

    const previousStatuses = previousStatusesRef.current;
    const nextStatuses = new Map(tasks.map((task) => [task.id, task.status]));
    previousStatusesRef.current = nextStatuses;

    if (!previousStatuses) return;

    const hasNewlyFinishedTask = tasks.some((task) => {
      const previousStatus = previousStatuses.get(task.id);
      return (
        previousStatus !== undefined &&
        !TERMINAL_STATUSES.has(previousStatus) &&
        TERMINAL_STATUSES.has(task.status)
      );
    });

    if (hasNewlyFinishedTask) invalidateDomains(queryClient, BROAD_FINANCE_DOMAINS);
  }, [query.data, queryClient]);

  return query;
}

export function useAgentTask(id: string) {
  return useQuery({
    queryKey: agentTaskKeys.detail(id),
    queryFn: () => agentTasksService.getById(id),
    enabled: !!id,
    staleTime: 0,
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

/** Opens an SSE stream for the given task ID and merges live updates into the query cache. */
export function useAgentTaskSocket(taskId: string | null) {
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const streamUrl = `${BASE_URL}/agent-tasks/${taskId}/stream`;
    const RECONNECT_DELAY_MS = 3000;
    let active = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let financeInvalidatedOnTerminal = false;

    const connect = () => {
      if (!active) return;
      const source = new EventSource(streamUrl);
      sourceRef.current = source;

      source.onmessage = (ev) => {
        try {
          const raw = JSON.parse(ev.data);

          // On connect ack, invalidate to get full fresh state from HTTP
          if (raw.type === 'connected') {
            queryClient.invalidateQueries({ queryKey: agentTaskKeys.detail(taskId) });
            return;
          }
          if (raw.type === 'ping') return;

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

          if (!financeInvalidatedOnTerminal && TERMINAL_STATUSES.has(payload.status)) {
            financeInvalidatedOnTerminal = true;
            invalidateDomains(queryClient, BROAD_FINANCE_DOMAINS);
          }
        } catch (error) {
          logger.child('agentTasks').debug('SSE payload parse failed', { error });
        }
      };

      // Reverse proxies in front of the container drop long-lived SSE connections.
      // EventSource retries transient errors on its own; once the browser gives the
      // connection up for dead (CLOSED) it never retries, so reopen it manually.
      // Each reconnect's `connected` ack refetches the full task state over HTTP,
      // backfilling any events missed while the stream was down.
      source.onerror = () => {
        if (source.readyState !== EventSource.CLOSED) return;
        logger.child('agentTasks').warn('SSE stream closed, reconnecting', { taskId });
        source.close();
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [taskId, queryClient]);
}
