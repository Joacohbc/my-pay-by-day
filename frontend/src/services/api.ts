import i18n from '@/lib/i18n';
import { getCurrency } from '@/lib/format';
import { fromServerDate, getUserTimezone, toServerDate, transformDates } from '@/lib/utils/dateUtils';
import { logger } from '@/lib/logger';
import { NETWORK_FAILURE_STATUS, reportApiTiming, type ApiFailureKind } from '@/lib/rumReporter';

// In production (Docker) VITE_API_BASE_URL is injected at container startup
// via /env.js into window.__env__. In dev, Vite exposes it through import.meta.env.
function resolveBaseUrl(): string {
  
  // Runtime environment (Docker): read from window.__env__
  const runtimeEnv = (window as { __env__?: Record<string, unknown> }).__env__;
  if (runtimeEnv?.VITE_API_BASE_URL 
      && typeof runtimeEnv.VITE_API_BASE_URL === 'string' 
      && runtimeEnv.VITE_API_BASE_URL !== '') {
    return runtimeEnv.VITE_API_BASE_URL;
  }

  // Build-time environment (Vite): read from import.meta.env
  const buildTimeUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof buildTimeUrl === 'string' && buildTimeUrl !== '') {
    return buildTimeUrl;
  }

  return '/api';
}

export const BASE_URL = resolveBaseUrl();

function getLang(): string {
  return i18n.language ?? 'en';
}

/** Lets a caller override the correlation ID, e.g. chat-scoped calls that prefix it with their chat id. */
export interface RequestOptions {
  signal?: AbortSignal;
  requestId?: string;
}

const REQUEST_ID_HEADER = 'X-Request-Id';

/**
 * Common context headers sent on every request. `X-Request-Id` is a correlation ID that the backend
 * and chatbot echo into their logs, giving an end-to-end trace from the browser through both
 * services. It is a fresh UUID unless the caller supplies one.
 */
function contextHeaders(extra: Record<string, string> = {}, requestId?: string): Record<string, string> {
  return {
    ...extra,
    'X-Timezone': getUserTimezone(),
    'X-Language': getLang(),
    'X-Currency': getCurrency(),
    [REQUEST_ID_HEADER]: requestId ?? crypto.randomUUID(),
    'X-Source': 'frontend',
  };
}

/** Every method below builds its headers with `contextHeaders`, so the correlation ID is always there to read back. */
function requestIdOf(init: RequestInit): string {
  const headers = init.headers as Record<string, string> | undefined;
  return headers?.[REQUEST_ID_HEADER] ?? '';
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.response ?? body.message ?? body.error ?? body.transcription ?? message;
    } catch (error) {
      logger.child('api').debug('Error response body was not JSON', { error, status: res.status, url: res.url });
    }
    throw new Error(message);
  }
  if (res.status === 204) return null as T;
  const data = await res.json();
  // Transform all server timezone date strings from the server to the user's timezone
  return transformDates(data, fromServerDate) as T;
}

/**
 * Tells apart a rejection the app caused from one the network did. A superseded query or a
 * navigation aborts its own request through `signal`, which is ordinary behaviour and not a
 * connectivity problem — counting those as network failures is what made that panel unreadable.
 */
function failureKindOfRejection(error: unknown): ApiFailureKind {
  return (error as Error)?.name === 'AbortError' ? 'aborted' : 'network';
}

/**
 * Tells apart a rejection the app issued from one produced before the request ever reached it.
 *
 * Both the backend (`CorrelationIdFilter`) and the chatbot echo `X-Request-Id` on every response
 * they produce; Cloudflare Access, the tunnel and nginx's own error pages cannot, because no
 * upstream ran. So the header's absence on an error is the one signal that separates "the app said
 * no" from "something between the browser and the app said no" — a distinction no status code
 * carries, since a 403 looks identical either way.
 */
function failureKindOfResponse(res: Response): ApiFailureKind | undefined {
  if (res.ok) return undefined;
  return res.headers.get(REQUEST_ID_HEADER) ? 'api' : 'edge';
}

/**
 * Single fetch chokepoint for the api layer: builds the URL and measures how long the call took as
 * the browser sees it, feeding the RUM reporter (which samples, so this is cheap on the hot path).
 * A rejected fetch never reached the server, so it reports `NETWORK_FAILURE_STATUS` and re-throws.
 */
async function timedFetch(method: string, path: string, init: RequestInit = {}): Promise<Response> {
  const startedAt = performance.now();
  const requestId = requestIdOf(init);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...init, method });
    reportApiTiming({
      method,
      path,
      durationMs: performance.now() - startedAt,
      status: res.status,
      ok: res.ok,
      requestId,
      failureKind: failureKindOfResponse(res),
    });
    return res;
  } catch (error) {
    reportApiTiming({
      method,
      path,
      durationMs: performance.now() - startedAt,
      status: NETWORK_FAILURE_STATUS,
      ok: false,
      requestId,
      failureKind: failureKindOfRejection(error),
    });
    throw error;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    timedFetch('GET', path, {
      headers: contextHeaders({ Accept: 'application/json' }, options?.requestId),
      signal: options?.signal,
    }).then((r) => handleResponse<T>(r)),

  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> => {
    // Transform all local date strings to server timezone before sending to the server
    const transformedBody = body !== undefined ? transformDates(body, toServerDate) : undefined;
    return timedFetch('POST', path, {
      headers: contextHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }, options?.requestId),
      body: transformedBody !== undefined ? JSON.stringify(transformedBody) : undefined,
      signal: options?.signal,
    }).then((r) => handleResponse<T>(r));
  },

  put: <T>(path: string, body: unknown): Promise<T> => {
    // Transform all local date strings to server timezone before sending to the server
    const transformedBody = transformDates(body, toServerDate);
    return timedFetch('PUT', path, {
      headers: contextHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(transformedBody),
    }).then((r) => handleResponse<T>(r));
  },

  patch: <T>(path: string, body: unknown): Promise<T> => {
    // Transform all local date strings to server timezone before sending to the server
    const transformedBody = transformDates(body, toServerDate);
    return timedFetch('PATCH', path, {
      headers: contextHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(transformedBody),
    }).then((r) => handleResponse<T>(r));
  },

  delete: <T = void>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    timedFetch('DELETE', path, {
      headers: contextHeaders({ 'Content-Type': 'application/json' }, options?.requestId),
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => handleResponse<T>(r)),

  postForm: <T>(path: string, body: FormData, options?: RequestOptions): Promise<T> =>
    timedFetch('POST', path, {
      headers: contextHeaders({ Accept: 'application/json' }, options?.requestId),
      body,
    }).then((r) => handleResponse<T>(r)),

  getBlob: (path: string): Promise<Blob> =>
    timedFetch('GET', path, {
      headers: contextHeaders(),
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.blob();
    }),

  postBinary: <T>(path: string, body: Blob, contentType: string): Promise<T> =>
    timedFetch('POST', path, {
      headers: contextHeaders({ 'Content-Type': contentType, Accept: 'application/json' }),
      body,
    }).then((r) => handleResponse<T>(r)),
};
