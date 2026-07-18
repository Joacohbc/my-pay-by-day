import { AsyncLocalStorage } from 'node:async_hooks';
import type { LogFields } from '@/logging/logger.js';

/**
 * Ambient per-request fields (the correlation `requestId`, and optionally `chatId`) that the logger
 * stamps onto every line emitted within the request — the Node equivalent of the backend's logging
 * MDC. Populated by the HTTP middleware and by the background task executor when a task resumes.
 */
export const requestStore = new AsyncLocalStorage<LogFields>();

export function runWithRequestContext<T>(fields: LogFields, fn: () => T): T {
  return requestStore.run(fields, fn);
}

export function currentRequestFields(): LogFields | undefined {
  return requestStore.getStore();
}
