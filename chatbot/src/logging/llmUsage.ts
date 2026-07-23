import { APICallError } from 'ai';
import { logger, type LogFields } from '@/logging/logger.js';

export type LlmFlow =
  | 'chat' | 'agent' | 'delegate' | 'extraction' | 'formPatch'
  | 'text' | 'title' | 'compaction' | 'audio' | 'audioEdit';

const llmLog = logger.child('llm');

export interface UsageLike {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

interface OpenRouterUsageMetadata {
  cost?: number;
}

function openRouterUsage(providerMetadata: unknown): OpenRouterUsageMetadata | undefined {
  return (providerMetadata as { openrouter?: { usage?: OpenRouterUsageMetadata } } | undefined)?.openrouter?.usage;
}

/** Reads the OpenRouter-reported cost (USD) for a single model call from its providerMetadata, when usage accounting is enabled on the model. */
export function costOf(providerMetadata: unknown): number | undefined {
  return openRouterUsage(providerMetadata)?.cost;
}

interface StepUsageLike {
  usage?: UsageLike;
  providerMetadata?: unknown;
}

/**
 * generateText does not expose an aggregate `totalUsage` across tool-calling steps the way
 * streamText's onFinish does, so multi-step flows (agent loop, extraction agent) must sum each
 * step's usage/cost themselves.
 */
export function aggregateStepUsage(steps: readonly StepUsageLike[]): { usage: UsageLike; costUsd?: number } {
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let costUsd: number | undefined;
  for (const step of steps) {
    inputTokens += step.usage?.inputTokens ?? 0;
    outputTokens += step.usage?.outputTokens ?? 0;
    totalTokens += step.usage?.totalTokens ?? 0;
    const stepCost = costOf(step.providerMetadata);
    if (stepCost != null) costUsd = (costUsd ?? 0) + stepCost;
  }
  return { usage: { inputTokens, outputTokens, totalTokens }, costUsd };
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

/** Logs one summary line per LLM call: tokens, model, cost (if OpenRouter usage accounting is enabled) and latency. */
export function logLlmUsage(
  flow: LlmFlow,
  model: string,
  durationMs: number,
  usage?: UsageLike,
  costUsd?: number,
  extra?: LogFields,
): void {
  llmLog.info('llm usage', {
    event: 'llm_usage',
    flow,
    model,
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    totalTokens: usage?.totalTokens ?? 0,
    ...(costUsd != null && { costUsd }),
    durationMs,
    ...extra,
  });
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
