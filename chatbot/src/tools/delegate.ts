import { readUIMessageStream, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import { buildAllTools, toolsForMode } from '@/agent/buildTools.js';
import { config } from '@/config.js';
import type { RequestContext } from '@/context.js';
import { groundingNow } from '@/dates.js';
import { longTermMemory } from '@/memory/longTerm.js';
import { largeModel } from '@/models.js';
import { subagentSystemPrompt, type ExecutionMode } from '@/prompts/system.js';
import type { KindedToolSet } from '@/tools/types.js';

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

/** Lets the interactive chat delegate a self-contained, multi-step job to a sub-agent that runs synchronously inside the same turn. */
export function buildDelegateTools(ctx: RequestContext, parentMode: ExecutionMode): KindedToolSet {
  return {
    delegateTask: {
      kind: 'READ',
      tool: tool({
        description:
          'Delegate a self-contained job to a focused sub-agent that works within this turn and returns only a summary. ' +
          'Use this for multi-step work whose intermediate detail the user does not need to see (e.g. "categorize these drafts"). ' +
          'The instruction must include every id, name and amount you already know.',
        inputSchema: z.object({
          instruction: z.string().describe('A clear, self-contained instruction with all context the sub-agent needs.'),
          mode: z.enum(EXECUTION_MODES).default('READ_ONLY').describe('Capability level granted to the sub-agent.'),
        }),
        execute: async function* ({ instruction, mode }, { abortSignal }) {
          const effectiveMode = clampMode(mode, parentMode);
          const result = streamText({
            model: largeModel(),
            system: subagentSystemPrompt({
              now: groundingNow(ctx.timezone),
              timezone: ctx.timezone,
              lang: ctx.lang,
              memories: longTermMemory.contents(),
              mode: effectiveMode,
            }),
            prompt: instruction,
            tools: toolsForMode(buildAllTools(ctx), effectiveMode),
            stopWhen: stepCountIs(config.agent.subagentMaxSteps),
            abortSignal,
          });
          for await (const message of readUIMessageStream({ stream: result.toUIMessageStream() })) {
            yield message;
          }
        },
        toModelOutput: ({ output }) => ({ type: 'text', value: lastTextOf(output as UIMessage | undefined) }),
      }),
    },
  };
}
