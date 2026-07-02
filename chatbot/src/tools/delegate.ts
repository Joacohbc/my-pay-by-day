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

function getFriendlyToolProgress(toolName: string, lang: string): string {
  const isEs = lang === 'es';
  const progressMessages: Record<string, { en: string; es: string }> = {
    listCategories: { en: 'Checking budget categories...', es: 'Consultando categorías de presupuesto...' },
    listTags: { en: 'Checking tags...', es: 'Consultando etiquetas...' },
    listTagGroups: { en: 'Checking tag groups...', es: 'Consultando grupos de etiquetas...' },
    listNodes: { en: 'Checking accounts and nodes...', es: 'Consultando cuentas y entidades...' },
    searchEvents: { en: 'Searching transaction history...', es: 'Buscando movimientos en el historial...' },
    getEvent: { en: 'Retrieving transaction details...', es: 'Obteniendo detalles del movimiento...' },
    listDrafts: { en: 'Listing pending drafts...', es: 'Listando borradores pendientes...' },
    getDraft: { en: 'Retrieving draft details...', es: 'Obteniendo borrador...' },
    createDraft: { en: 'Creating draft event...', es: 'Creando borrador de transacción...' },
    updateDraft: { en: 'Updating draft event...', es: 'Actualizando borrador...' },
    deleteDraft: { en: 'Deleting draft event...', es: 'Eliminando borrador...' },
    confirmDraft: { en: 'Confirming draft event...', es: 'Confirmando borrador...' },
    updateEvent: { en: 'Updating transaction details...', es: 'Actualizando detalles de la transacción...' },
    calculate: { en: 'Performing calculations...', es: 'Realizando cálculos matemáticos...' },
    getCurrentDateTime: { en: 'Checking date and time...', es: 'Consultando fecha y hora...' },
    saveMemory: { en: 'Saving preference to memory...', es: 'Guardando datos en la memoria...' },
    recallMemory: { en: 'Recalling preferences...', es: 'Recordando preferencias...' },
    forgetMemory: { en: 'Forgetting memory...', es: 'Olvidando memoria...' },
  };

  const entry = progressMessages[toolName];
  if (entry) return isEs ? entry.es : entry.en;
  return isEs ? `Ejecutando ${toolName}...` : `Running ${toolName}...`;
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
          title: z.string().describe('A clear, user-friendly title in Spanish describing what this subtask does (e.g. "Categorizando borradores de Supermercado").'),
          instruction: z.string().describe('A clear, self-contained instruction with all context the sub-agent needs.'),
          mode: z.enum(EXECUTION_MODES).default('READ_ONLY').describe('Capability level granted to the sub-agent.'),
        }),
        execute: async function* ({ title, instruction, mode }, { abortSignal }) {
          const effectiveMode = clampMode(mode, parentMode);
          yield { type: 'progress', title, message: ctx.lang === 'es' ? 'Iniciando subtarea...' : 'Starting subtask...' };
          
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
          
          let lastMsg: UIMessage | undefined;
          for await (const message of readUIMessageStream({ stream: result.toUIMessageStream() })) {
            lastMsg = message;
            const activeToolCall = message.parts.find((p) => p.type === 'tool-call');
            if (activeToolCall && 'toolName' in activeToolCall) {
              const friendlyProgress = getFriendlyToolProgress(activeToolCall.toolName as string, ctx.lang);
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
