import { tool } from 'ai';
import { z } from 'zod';
import type { KindedToolSet } from '@/tools/types.js';
import { recordAction, recordStep, updateStatus } from '@/agent/notify.js';
import { PauseSignal } from '@/agent/signals.js';

/** Tools available only to the background agent (progress reporting and human-in-the-loop). */
export function buildAgentTools(taskId: string): KindedToolSet {
  return {
    reportProgress: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Reporting progress...', es: 'Reportando progreso...' } },
      tool: tool({
        description:
          'Report a progress update as you work. Call this at meaningful milestones with a 0-100 percentage and a short message describing the current step.',
        inputSchema: z.object({
          progress: z.number().min(0).max(100),
          message: z.string(),
        }),
        execute: async ({ progress, message }) => {
          updateStatus(taskId, 'RUNNING', progress, message);
          recordStep(taskId, { type: 'PROGRESS', description: message });
          return { acknowledged: true };
        },
      }),
    },

    requestUserAction: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Waiting for a user decision...', es: 'Esperando una decisión del usuario...' } },
      tool: tool({
        description:
          'Pause and ask the human to make a decision or approve an action before continuing. Use for approvals or when you need information you cannot obtain. The task pauses until the user responds; you will resume afterwards.',
        inputSchema: z.object({
          actionType: z.enum(['APPROVAL', 'INFORMATION', 'FEEDBACK']).default('APPROVAL'),
          message: z.string(),
        }),
        execute: async ({ actionType, message }): Promise<{ paused: boolean }> => {
          const step = recordStep(taskId, { type: 'MESSAGE', description: 'Waiting for the user', content: message });
          const action = recordAction(taskId, { stepId: step.id, actionType, payload: message });
          updateStatus(taskId, 'PAUSED');
          throw new PauseSignal(action.id);
        },
      }),
    },
  };
}
