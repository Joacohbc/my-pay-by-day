import createClient, { type Client, type Middleware } from 'openapi-fetch';
import { config } from '@/config.js';
import type { RequestContext } from '@/context.js';
import type { ServerDateTime } from '@/dates.js';
import type { components, paths } from '@/backend/schema.js';

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
  const localeHeaders: Middleware = {
    onRequest({ request }) {
      request.headers.set('X-Timezone', ctx.timezone);
      request.headers.set('X-Language', ctx.lang);
      request.headers.set('X-Request-Id', ctx.requestId);
      return request;
    },
  };
  client.use(localeHeaders);
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
    },
  });
  if (!res.ok) throw new BackendError(res.status, `HTTP ${res.status}`);
  return res.text();
}
