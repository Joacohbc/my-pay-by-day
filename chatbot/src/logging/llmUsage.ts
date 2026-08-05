import { APICallError } from 'ai';
import { logger, type LogFields } from '@/logging/logger.js';

export type LlmFlow =
  | 'chat' | 'agent' | 'delegate' | 'extraction' | 'formPatch'
  | 'text' | 'title' | 'compaction' | 'recap' | 'audio' | 'audioEdit';

const llmLog = logger.child('llm');

interface UsageLike {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

interface OpenRouterUsageMetadata {
  cost?: number;
  costDetails?: { upstreamInferenceCost?: number };
}

function openRouterUsage(providerMetadata: unknown): OpenRouterUsageMetadata | undefined {
  return (providerMetadata as { openrouter?: { usage?: OpenRouterUsageMetadata } } | undefined)?.openrouter?.usage;
}

/**
 * Reads what OpenRouter charged for one generation, when usage accounting is enabled on the model.
 *
 * `usage.cost` alone is what comes off the OpenRouter credit balance; on a BYOK key the inference is
 * billed upstream and reported separately as `cost_details.upstream_inference_cost`. OpenRouter's own
 * activity page shows the two together, so both are summed here or the totals cannot be compared.
 * @see https://openrouter.ai/docs/use-cases/usage-accounting
 */
function costOf(providerMetadata: unknown): number | undefined {
  const usage = openRouterUsage(providerMetadata);
  const upstreamInferenceCost = usage?.costDetails?.upstreamInferenceCost;
  if (usage?.cost == null && upstreamInferenceCost == null) return undefined;
  return (usage?.cost ?? 0) + (upstreamInferenceCost ?? 0);
}

/** One LLM call: a step of a tool-calling loop, or the whole of a single-shot generation. */
export interface LlmGeneration {
  readonly usage?: UsageLike;
  readonly providerMetadata?: unknown;
}

/**
 * Logs one line per generation — a single LLM call, which is the unit OpenRouter bills and counts as
 * a request on its activity page. A tool-calling turn emits one of these per step.
 *
 * Deliberately not derived from a finished run: `onFinish` exposes only the *final* step's
 * providerMetadata, and does not fire at all when a stream is aborted or fails — yet OpenRouter
 * still charges for every generation that completed before that. Emitting at the step is what makes
 * the total reconcilable with OpenRouter instead of a silent undercount.
 *
 * Tokens and cost live here and nowhere else, so that summing them can never double-count a run.
 */
export function logLlmGeneration(flow: LlmFlow, model: string, generation: LlmGeneration, extra?: LogFields): void {
  const costUsd = costOf(generation.providerMetadata);
  llmLog.info('llm generation', {
    event: 'llm_generation',
    flow,
    model,
    inputTokens: generation.usage?.inputTokens ?? 0,
    outputTokens: generation.usage?.outputTokens ?? 0,
    totalTokens: generation.usage?.totalTokens ?? 0,
    ...(costUsd != null && { costUsd }),
    ...extra,
  });
}

/** Logs one line per run: how long the user waited, and how many generations it took to answer. */
export function logLlmRun(flow: LlmFlow, model: string, durationMs: number, generations: number, extra?: LogFields): void {
  llmLog.info('llm run', {
    event: 'llm_run',
    flow,
    model,
    generations,
    durationMs,
    ...extra,
  });
}

/** Classifies an LLM call failure into a small, stable set of causes for dashboard grouping. */
export function classifyLlmError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    if (status === 429) return 'rate_limit';
    if (status === 401 || status === 403) return 'auth';
    if (status != null && status >= 500) return 'provider_5xx';
    if (status != null && status >= 400) return 'bad_request';
    return 'api_error';
  }
  const name = (error as Error)?.name ?? '';
  if (name === 'AbortError' || name === 'TimeoutError') return 'timeout';
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|socket|network/i.test((error as Error)?.message ?? '')) return 'network';
  return 'unknown';
}

/** Logs an LLM call failure with a classified cause, so dashboards can break failures down by why they happened. */
export function logLlmError(flow: LlmFlow, model: string, durationMs: number, error: unknown, extra?: LogFields): void {
  llmLog.error('llm call failed', {
    event: 'llm_error',
    flow,
    model,
    durationMs,
    cause: classifyLlmError(error),
    error: error instanceof Error ? error.message : String(error),
    ...extra,
  });
}
