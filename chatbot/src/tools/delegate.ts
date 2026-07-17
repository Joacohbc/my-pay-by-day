import { readUIMessageStream, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import { buildAllTools, toolsForMode } from '@/agent/buildTools.js';
import { config } from '@/config.js';
import type { RequestContext } from '@/context.js';
import { groundingNow } from '@/dates.js';
import { longTermMemory } from '@/memory/longTerm.js';
import { logger } from '@/logging/logger.js';
import { largeModel } from '@/models.js';
import { subagentSystemPrompt, type ExecutionMode } from '@/prompts/system.js';
import type { KindedToolSet } from '@/tools/types.js';

const delegateLog = logger.child('delegate');

const EXECUTION_MODES = ['AUTONOMOUS', 'DRAFT_ONLY', 'READ_ONLY', 'DRAFT_CONFIRMATION'] as const;

function clampMode(requestedMode: ExecutionMode, parentMode: ExecutionMode): ExecutionMode {
  if (parentMode === 'AUTONOMOUS') return requestedMode;
  if (requestedMode === 'READ_ONLY') return 'READ_ONLY';
  return parentMode;
}

function lastTextOf(message: UIMessage | undefined): string {
  const lastTextPart = message?.parts.findLast((part) => part.type === 'text');
  return lastTextPart && 'text' in lastTextPart && lastTextPart.text.trim()
    ? lastTextPart.text
    : 'Sub-agent finished without a summary.';
}

function getFriendlyToolProgress(toolSet: KindedToolSet, toolName: string, lang: string): string {
  const isEs = lang === 'es';
  const label = toolSet[toolName]?.ui.label;
  if (label) return isEs ? label.es : label.en;
  return isEs ? `Ejecutando ${toolName}...` : `Running ${toolName}...`;
}

/** Lets the interactive chat delegate a self-contained, multi-step job to a sub-agent that runs synchronously inside the same turn. */
export function buildDelegateTools(ctx: RequestContext, parentMode: ExecutionMode): KindedToolSet {
  return {
    delegateTask: {
      kind: 'READ',
      ui: { invalidates: ['agentTasks'], label: { en: 'Delegating to a sub-agent...', es: 'Delegando a un subagente...' } },
      tool: tool({
        description:
          'Delegate a self-contained job to a focused sub-agent that works within this turn and returns only a summary. ' +
          'Use this for multi-step work whose intermediate detail the user does not need to see (e.g. "categorize these drafts"). ' +
          'The instruction must include every id, name and amount you already know.',
        inputSchema: z.object({
          title: z.string().describe('A clear, user-friendly title in Spanish describing what this subtask does (e.g. "Categorizando borradores de Supermercado").'),
          instruction: z.string().describe('A clear, self-contained instruction with all context the sub-agent needs.'),
          mode: z.enum(EXECUTION_MODES).default('READ_ONLY').describe('Capability level granted to the sub-agent.'),
        }),
        execute: async function* ({ title, instruction, mode }, { abortSignal }) {
          const effectiveMode = clampMode(mode, parentMode);
          yield { type: 'progress', title, message: ctx.lang === 'es' ? 'Iniciando subtarea...' : 'Starting subtask...' };

          const kindedTools = buildAllTools(ctx);
          const result = streamText({
            model: largeModel(),
            system: subagentSystemPrompt({
              now: groundingNow(ctx.timezone),
              timezone: ctx.timezone,
              lang: ctx.lang,
              currency: ctx.currency,
              memories: longTermMemory.contents(),
              mode: effectiveMode,
            }),
            prompt: instruction,
            // TODO(follow-up): this sub-agent bypasses the interactive chat's tool-approval gate
            // (toolsForModeWithApproval) entirely — out of scope for that change, tracked separately.
            tools: toolsForMode(kindedTools, effectiveMode),
            stopWhen: stepCountIs(config.agent.subagentMaxSteps),
            abortSignal,
            onError: ({ error }) => {
              delegateLog.error('sub-agent stream failed', {
                title,
                error: error instanceof Error ? error.message : String(error),
              });
            },
          });
          
          let lastMsg: UIMessage | undefined;
          for await (const message of readUIMessageStream({ stream: result.toUIMessageStream() })) {
            lastMsg = message;
            const activeToolCall = message.parts.find((p) => p.type === 'tool-call');
            if (activeToolCall && 'toolName' in activeToolCall) {
              const friendlyProgress = getFriendlyToolProgress(kindedTools, activeToolCall.toolName as string, ctx.lang);
              yield { type: 'progress', title, message: friendlyProgress };
            } else {
              yield { type: 'progress', title, message: ctx.lang === 'es' ? 'Pensando...' : 'Thinking...' };
            }
          }
          if (lastMsg) {
            yield lastMsg;
          }
        },
        toModelOutput: ({ output }) => ({ type: 'text', value: lastTextOf(output as UIMessage | undefined) }),
      }),
    },
  };
}
