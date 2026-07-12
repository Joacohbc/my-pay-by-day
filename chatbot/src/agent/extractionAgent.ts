import { generateText, stepCountIs, type ModelMessage } from 'ai';
import { buildAllTools, toolsForMode } from '@/agent/buildTools.js';
import { buildExtractionUserContent, type ExtractInput } from '@/agent/extraction.js';
import { createApiClient, unwrap } from '@/backend/client.js';
import { config } from '@/config.js';
import type { RequestContext } from '@/context.js';
import { groundingNow } from '@/dates.js';
import { logger } from '@/logging/logger.js';
import { largeModel } from '@/models.js';
import { extractionAgentSystemPrompt } from '@/prompts/system.js';

const extractionAgentLog = logger.child('extraction-agent');

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
  const userMessage: ModelMessage = { role: 'user', content: displayContent };

  const result = await generateText({
    model: largeModel(),
    system: extractionAgentSystemPrompt({
      now: groundingNow(ctx.timezone),
      timezone: ctx.timezone,
      lang: ctx.lang,
      templateContext,
    }),
    messages: [{ role: 'user', content: modelContent }],
    tools: toolsForMode(buildAllTools(ctx), 'DRAFT_ONLY'),
    stopWhen: stepCountIs(config.agent.subagentMaxSteps),
  });

  const draftId = findCreatedDraftId(result.steps);
  if (draftId == null) {
    extractionAgentLog.error('extraction agent finished without creating a draft', { text: result.text });
    throw new Error('extraction_failed_no_draft');
  }

  return { draftId, summary: result.text.trim(), userMessage, responseMessages: result.response.messages };
}
