import i18n from '@/i18n';
import { fromServerDate, toServerDate, transformDates } from '@/utils/dateUtils';

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

const BASE_URL = resolveBaseUrl();

function withLang(path: string): string {
  const lang = i18n.language ?? 'en';
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}lang=${lang}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  // Transform all UTC date strings from the server to the user's timezone
  return transformDates(data, fromServerDate) as T;
}

export const api = {
  get: <T>(path: string): Promise<T> =>
    fetch(`${BASE_URL}${withLang(path)}`, {
      headers: { Accept: 'application/json', 'X-Timezone': 'UTC' }
    }).then((r) => handleResponse<T>(r)),

  post: <T>(path: string, body: unknown): Promise<T> => {
    // Transform all local date strings to UTC before sending to the server
    const transformedBody = transformDates(body, toServerDate);
    return fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Timezone': 'UTC' },
      body: JSON.stringify(transformedBody),
    }).then((r) => handleResponse<T>(r));
  },

  put: <T>(path: string, body: unknown): Promise<T> => {
    // Transform all local date strings to UTC before sending to the server
    const transformedBody = transformDates(body, toServerDate);
    return fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Timezone': 'UTC' },
      body: JSON.stringify(transformedBody),
    }).then((r) => handleResponse<T>(r));
  },

  patch: <T>(path: string, body: unknown): Promise<T> => {
    // Transform all local date strings to UTC before sending to the server
    const transformedBody = transformDates(body, toServerDate);
    return fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Timezone': 'UTC' },
      body: JSON.stringify(transformedBody),
    }).then((r) => handleResponse<T>(r));
  },

  delete: (path: string): Promise<void> =>
    fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'DELETE',
      headers: { 'X-Timezone': 'UTC' }
    }).then((r) => handleResponse<void>(r)),
};
