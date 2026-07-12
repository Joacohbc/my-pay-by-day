import i18n from '@/lib/i18n';
import { getCurrency } from '@/lib/format';
import { fromServerDate, getUserTimezone, toServerDate, transformDates } from '@/lib/utils/dateUtils';

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

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.response ?? body.message ?? body.error ?? body.transcription ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return null as T;
  const data = await res.json();
  // Transform all server timezone date strings from the server to the user's timezone
  return transformDates(data, fromServerDate) as T;
}

export const api = {
  get: <T>(path: string): Promise<T> =>
    fetch(`${BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        'X-Timezone': getUserTimezone(),
        'X-Language': getLang(),
        'X-Currency': getCurrency(),
      }
    }).then((r) => handleResponse<T>(r)),

  post: <T>(path: string, body?: unknown, options?: { signal?: AbortSignal }): Promise<T> => {
    // Transform all local date strings to server timezone before sending to the server
    const transformedBody = body !== undefined ? transformDates(body, toServerDate) : undefined;
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Timezone': getUserTimezone(),
        'X-Language': getLang(),
        'X-Currency': getCurrency(),
      },
      body: transformedBody !== undefined ? JSON.stringify(transformedBody) : undefined,
      signal: options?.signal,
    }).then((r) => handleResponse<T>(r));
  },

  put: <T>(path: string, body: unknown): Promise<T> => {
    // Transform all local date strings to server timezone before sending to the server
    const transformedBody = transformDates(body, toServerDate);
    return fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Timezone': getUserTimezone(),
        'X-Language': getLang(),
        'X-Currency': getCurrency(),
      },
      body: JSON.stringify(transformedBody),
    }).then((r) => handleResponse<T>(r));
  },

  patch: <T>(path: string, body: unknown): Promise<T> => {
    // Transform all local date strings to server timezone before sending to the server
    const transformedBody = transformDates(body, toServerDate);
    return fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Timezone': getUserTimezone(),
        'X-Language': getLang(),
        'X-Currency': getCurrency(),
      },
      body: JSON.stringify(transformedBody),
    }).then((r) => handleResponse<T>(r));
  },

  delete: <T = void>(path: string, body?: unknown): Promise<T> =>
    fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Timezone': getUserTimezone(),
        'X-Language': getLang(),
        'X-Currency': getCurrency(),
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => handleResponse<T>(r)),

  postForm: <T>(path: string, body: FormData): Promise<T> =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-Timezone': getUserTimezone(),
        'X-Language': getLang(),
        'X-Currency': getCurrency(),
      },
      body,
    }).then((r) => handleResponse<T>(r)),

  getBlob: (path: string): Promise<Blob> =>
    fetch(`${BASE_URL}${path}`, {
      headers: {
        'X-Timezone': getUserTimezone(),
        'X-Language': getLang(),
        'X-Currency': getCurrency(),
      }
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.blob();
    }),

  postBinary: <T>(path: string, body: Blob, contentType: string): Promise<T> =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Accept: 'application/json',
        'X-Timezone': getUserTimezone(),
        'X-Language': getLang(),
        'X-Currency': getCurrency(),
      },
      body,
    }).then((r) => handleResponse<T>(r)),
};
