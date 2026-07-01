import { tool } from 'ai';
import { z } from 'zod';
import type { RequestContext } from '@/context.js';
import { submitTask } from '@/agent/executor.js';
import { agentStore } from '@/agent/store.js';
import type { KindedToolSet } from '@/tools/types.js';

/** Lets the interactive chat delegate a long, multi-step job to a background agent. */
export function buildBackgroundTools(ctx: RequestContext): KindedToolSet {
  return {
    startBackgroundTask: {
      kind: 'READ',
      tool: tool({
        description:
          'Delegate a longer, multi-step job to an autonomous background agent that works on its own and reports progress. ' +
          'Use this when the user asks for something that needs many steps or will take a while (e.g. "categorize all my uncategorized events"). ' +
          'Returns the background task id the user can follow.',
        inputSchema: z.object({
          instruction: z.string().describe('A clear, self-contained instruction for the background agent.'),
          executionMode: z
            .enum(['AUTONOMOUS', 'DRAFT_ONLY', 'READ_ONLY', 'DRAFT_CONFIRMATION'])
            .default('AUTONOMOUS'),
        }),
        execute: async ({ instruction, executionMode }) => {
          const task = agentStore.create({
            instruction,
            executionMode,
            lang: ctx.lang,
            timezone: ctx.timezone,
          });
          submitTask(task.id);
          return { taskId: task.id, status: 'PENDING' };
        },
      }),
    },
  };
}
