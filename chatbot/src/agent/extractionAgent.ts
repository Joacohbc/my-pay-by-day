import { generateText, stepCountIs, type ModelMessage, type PrepareStepFunction, type Tool } from 'ai';
import { buildAllTools, toolsForMode } from '@/agent/buildTools.js';
import { buildExtractionUserContent, type ExtractInput } from '@/agent/extraction.js';
import { createApiClient, unwrap } from '@/backend/client.js';
import { config } from '@/config.js';
import type { RequestContext } from '@/context.js';
import { groundingNow } from '@/dates.js';
import { logger } from '@/logging/logger.js';
import { logLlmError, logLlmGeneration, logLlmRun } from '@/logging/llmUsage.js';
import { largeModel } from '@/models.js';
import { longTermMemory } from '@/memory/longTerm.js';
import { extractionAgentSystemPrompt } from '@/prompts/system.js';

const extractionAgentLog = logger.child('extraction-agent');

const CREATE_DRAFT_TOOL = 'createDraft';

/**
 * The input already carries the whole document, so the agent only needs to resolve IDs, match the user's
 * naming style and stage the draft. File, chat and exchange-rate reads are left out on purpose: with them
 * the agent spent its whole step budget re-reading the input and unrelated emails and never created a draft.
 */
const EXTRACTION_TOOL_NAMES: readonly string[] = [
  'getWorkspaceInfo', 'listNodes', 'listCategories', 'listTags', 'searchEvents', 'calculate', CREATE_DRAFT_TOOL,
];

function extractionTools(ctx: RequestContext): Record<string, Tool> {
  const draftOnlyTools = toolsForMode(buildAllTools(ctx), 'DRAFT_ONLY');
  return Object.fromEntries(Object.entries(draftOnlyTools).filter(([name]) => EXTRACTION_TOOL_NAMES.includes(name)));
}

async function fetchTemplateContext(ctx: RequestContext, templateId: number | undefined): Promise<string | undefined> {
  if (templateId == null) return undefined;
  const client = createApiClient(ctx);
  const template = await unwrap(client.GET('/templates/{id}', { params: { path: { id: templateId } } }));
  return `USE THIS TEMPLATE AS THE BASIS (prefer its defaults unless the input clearly overrides them):\n${JSON.stringify(template)}`;
}

function findCreatedDraftId(steps: { toolResults: readonly { toolName: string; output: unknown }[] }[]): number | undefined {
  for (const step of steps) {
    for (const toolResult of step.toolResults) {
      if (toolResult.toolName !== 'createDraft') continue;
      const output = toolResult.output as { draftId?: number } | undefined;
      if (typeof output?.draftId === 'number') return output.draftId;
    }
  }
  return undefined;
}

/** Spends the last step of the budget on createDraft when the agent has not staged one yet. */
function forceDraftOnLastStep(maxSteps: number): PrepareStepFunction<Record<string, Tool>> {
  return ({ stepNumber, steps }) => {
    const isLastStep = stepNumber >= maxSteps - 1;
    if (!isLastStep || findCreatedDraftId(steps) != null) return undefined;
    extractionAgentLog.warn('step budget exhausted, forcing createDraft', { event: 'forced_draft', stepNumber });
    return { activeTools: [CREATE_DRAFT_TOOL], toolChoice: { type: 'tool', toolName: CREATE_DRAFT_TOOL } };
  };
}

export interface ExtractionAgentResult {
  draftId: number;
  summary: string;
  userMessage: ModelMessage;
  responseMessages: ModelMessage[];
}

/**
 * Runs the extraction agent: an autonomous, tool-calling pass over the user's input whose sole possible
 * outcome is a new standalone draft finance event. It never gets access to interaction tools (askUser,
 * requestUserAction) or anything beyond READ/DRAFT_WRITE, so it can never pause for a human decision and
 * can never touch a real event or confirm anything — it always finishes by staging one draft, even if
 * some fields are left incomplete.
 */
export async function runExtractionAgent(ctx: RequestContext, input: ExtractInput): Promise<ExtractionAgentResult> {
  const [{ model: modelContent, display: displayContent }, templateContext] = await Promise.all([
    buildExtractionUserContent(input),
    fetchTemplateContext(ctx, input.templateId),
  ]);
  // The receipt the draft was extracted from belongs on the draft, whether or not the model says so.
  const extractionCtx: RequestContext = { ...ctx, attachedFileIds: (input.files ?? []).map((file) => file.fileId) };
  const userMessage: ModelMessage = { role: 'user', content: displayContent };

  const maxSteps = config.agent.extractionMaxSteps;
  const startedAt = performance.now();
  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model: largeModel(),
      system: extractionAgentSystemPrompt({
        now: groundingNow(ctx.timezone),
        timezone: ctx.timezone,
        lang: ctx.lang,
        currency: ctx.currency,
        memories: longTermMemory.contents(),
        templateContext,
      }),
      messages: [{ role: 'user', content: modelContent }],
      tools: extractionTools(extractionCtx),
      stopWhen: stepCountIs(maxSteps),
      prepareStep: forceDraftOnLastStep(maxSteps),
      onStepFinish: (step) => logLlmGeneration('extraction', step.response.modelId, step),
    });
  } catch (error) {
    logLlmError('extraction', config.models.large, Math.round(performance.now() - startedAt), error);
    throw error;
  }

  const durationMs = Math.round(performance.now() - startedAt);
  logLlmRun('extraction', result.response.modelId, durationMs, result.steps.length);

  const draftId = findCreatedDraftId(result.steps);
  if (draftId == null) {
    extractionAgentLog.error('extraction agent finished without creating a draft', { cause: 'no_draft', text: result.text });
    throw new Error('extraction_failed_no_draft');
  }

  return { draftId, summary: result.text.trim(), userMessage, responseMessages: result.response.messages };
}
