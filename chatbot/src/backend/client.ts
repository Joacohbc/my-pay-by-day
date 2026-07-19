import createClient, { type Client, type Middleware } from 'openapi-fetch';
import { config } from '@/config.js';
import type { RequestContext } from '@/context.js';
import type { ServerDateTime } from '@/dates.js';
import { logger } from '@/logging/logger.js';
import type { components, paths } from '@/backend/schema.js';

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export class BackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'BackendError';
  }
}

type Schemas = components['schemas'];

export type ApiClient = Client<paths>;
export type FinanceEventDto = Schemas['FinanceEventDto'];
export type FinanceEventDraftInputDto = Schemas['FinanceEventDraftInputDto'];
export type FinanceNodeDto = Schemas['FinanceNodeDto'];
export type EventType = Schemas['EventType'];

/**
 * Wire shape accepted by `PATCH /events/{id}`. The generated `PatchEventDto` describes each field
 * as a `JsonNullable` object (`{ value, isPresent, undefined }`) because SmallRye introspects the
 * Java wrapper type, but jackson-databind-nullable actually deserializes the *raw* value. This type
 * captures what the backend really wants; {@link patchEvent} casts it to the generated type.
 */
export interface EventPatchBody {
  name?: string;
  description?: string | null;
  type?: EventType;
  category?: { id: number } | null;
  tags?: Array<{ id: number }>;
  transaction?: {
    transactionDate?: ServerDateTime | null;
    lineItems?: Array<{ financeNode: { id: number } | null; amount: number }>;
  };
}

/**
 * Builds a typed backend client bound to the request context. Every call carries the user's
 * timezone and language so the backend applies the same i18n / date logic it would for a direct
 * frontend request. One client per request, mirroring the previous per-request `BackendClient`.
 */
export function createApiClient(ctx: RequestContext): ApiClient {
  const client = createClient<paths>({ baseUrl: config.backendUrl });
  // Bind the correlation id explicitly: backend calls made while streaming a chat run after the
  // request's AsyncLocalStorage scope has exited, so the ambient store would no longer carry it.
  const backendLog = logger.child('backend').with({ requestId: ctx.requestId });
  const startTimes = new WeakMap<Request, number>();
  const contextMiddleware: Middleware = {
    onRequest({ request }) {
      // Don't return `request`/`response` from these hooks (see onResponse below for why).
      request.headers.set('X-Timezone', ctx.timezone);
      request.headers.set('X-Language', ctx.lang);
      request.headers.set('X-Request-Id', ctx.requestId);
      request.headers.set('X-Source', 'chatbot');
      startTimes.set(request, performance.now());
      backendLog.debug('backend →', { method: request.method, path: pathOf(request.url) });
    },
    onResponse({ request, response }) {
      // @hono/node-server swaps in its own `Response` class as soon as the server starts, so
      // openapi-fetch's "is this really a Response?" check fails on the real one our fetch() call
      // returns. That check only runs when a middleware hands a value back, so we just don't —
      // we're only reading the response here, never replacing it.
      const started = startTimes.get(request);
      const ms = started != null ? Math.round(performance.now() - started) : undefined;
      const fields = { method: request.method, path: pathOf(request.url), status: response.status, ms };
      if (response.ok) backendLog.info('backend ←', fields);
      else backendLog.warn('backend ← error', fields);
    },
  };
  client.use(contextMiddleware);
  return client;
}

/**
 * Awaits an openapi-fetch call and returns its data, translating an HTTP error into a
 * {@link BackendError}. openapi-fetch never throws on non-2xx, so this is what preserves the
 * throw-based flow the `safe()` tool wrapper relies on.
 */
export async function unwrap<T>(
  promise: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (!response.ok || error !== undefined) {
    throw new BackendError(response.status, extractMessage(error, response.status));
  }
  return data as T;
}

function extractMessage(error: unknown, status: number): string {
  if (error && typeof error === 'object') {
    const body = error as Record<string, unknown>;
    const message = body.message ?? body.error ?? body.response;
    if (typeof message === 'string') return message;
  }
  if (typeof error === 'string' && error) return error;
  return `HTTP ${status}`;
}

/** Applies a partial event update using the raw-value wire shape the backend expects. */
export function patchEvent(client: ApiClient, eventId: number, body: EventPatchBody) {
  return client.PATCH('/events/{id}', {
    params: { path: { id: eventId } },
    body: body as unknown as Schemas['PatchEventDto'],
  });
}

/** Fetches a plain-text backend response (e.g. base64 file content) not modelled as JSON. */
export async function getBackendText(ctx: RequestContext, path: string): Promise<string> {
  const res = await fetch(`${config.backendUrl}${path}`, {
    headers: {
      Accept: 'text/plain',
      'X-Timezone': ctx.timezone,
      'X-Language': ctx.lang,
      'X-Request-Id': ctx.requestId,
      'X-Source': 'chatbot',
    },
  });
  if (!res.ok) {
    logger.child('backend').with({ requestId: ctx.requestId }).warn('backend ← error', { path, status: res.status });
    throw new BackendError(res.status, `HTTP ${res.status}`);
  }
  return res.text();
}
