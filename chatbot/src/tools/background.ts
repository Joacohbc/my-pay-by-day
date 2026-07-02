import { tool } from 'ai';
import { z } from 'zod';
import type { RequestContext } from '@/context.js';
import { submitTask } from '@/agent/executor.js';
import { agentStore } from '@/agent/store.js';
import { db } from '@/db/index.js';
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
    getTaskResult: {
      kind: 'READ',
      tool: tool({
        description:
          'Check the status and result of a background task previously started with startBackgroundTask. ' +
          'Returns the current status, progress and the task final message when completed.',
        inputSchema: z.object({ taskId: z.string() }),
        execute: async ({ taskId }) => {
          const task = agentStore.detail(taskId);
          if (!task) return { error: `No background task found with id ${taskId}` };
          const resultMessage = task.steps?.findLast((step) => step.type === 'MESSAGE')?.content;
          const errorMessage = task.steps?.findLast((step) => step.type === 'ERROR')?.content;
          const pendingAction = task.actions?.findLast((action) => action.status === 'PENDING_APPROVAL');
          return {
            taskId: task.id,
            status: task.status,
            progress: task.progress,
            currentStep: task.currentStep,
            resultMessage,
            errorMessage,
            pendingUserAction: pendingAction
              ? { actionType: pendingAction.actionType, message: pendingAction.payload }
              : undefined,
          };
        },
      }),
    },
    listSessionTasks: {
      kind: 'READ',
      tool: tool({
        description:
          'List all background tasks currently or previously associated with this chat session, showing their statuses, progress and latest outcomes.',
        inputSchema: z.object({}),
        execute: async () => {
          if (!ctx.chatId) return { tasks: [] };
          
          const rows = db()
            .prepare("SELECT text FROM conversation_message WHERE chat_id = ? AND text LIKE '%[Background Task: %'")
            .all(ctx.chatId) as { text: string | null }[];

          const taskIds = new Set<string>();
          const taskRegex = /\[Background Task: ([a-f0-9-]+)\]/gi;
          for (const row of rows) {
            if (row.text) {
              let match;
              taskRegex.lastIndex = 0;
              while ((match = taskRegex.exec(row.text)) !== null) {
                taskIds.add(match[1]);
              }
            }
          }

          const tasks = [];
          for (const id of taskIds) {
            const task = agentStore.detail(id);
            if (task) {
              const resultMessage = task.steps?.findLast((step) => step.type === 'MESSAGE')?.content;
              const errorMessage = task.steps?.findLast((step) => step.type === 'ERROR')?.content;
              tasks.push({
                taskId: task.id,
                instruction: task.userInstruction,
                status: task.status,
                progress: task.progress,
                currentStep: task.currentStep,
                resultMessage,
                errorMessage,
              });
            }
          }
          return { tasks };
        },
      }),
    },
  };
}
