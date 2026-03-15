import i18n from '@/i18n';

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

let configTimezone: string | null = null;
let configFetchPromise: Promise<string | null> | null = null;

export function getConfigTimezone(): string | undefined {
  return configTimezone || undefined;
}

export async function initApiConfig(): Promise<void> {
  await fetchConfigTimezone();
}

async function fetchConfigTimezone(): Promise<string | null> {
  if (configTimezone !== null) {
    return configTimezone;
  }

  if (!configFetchPromise) {
    configFetchPromise = fetch(`${BASE_URL}/config`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch config');
        }
        const data = await res.json();
        configTimezone = data.timezone ?? null;
        return configTimezone;
      })
      .catch((err) => {
        console.error('Error fetching config:', err);
        configFetchPromise = null;
        return null;
      });
  }
  return configFetchPromise;
}

async function getHeaders(baseHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...baseHeaders, Accept: 'application/json' };
  const tz = await fetchConfigTimezone();
  if (tz) {
    headers['X-Timezone'] = tz;
  }
  return headers;
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
  return res.json() as Promise<T>;
}

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const headers = await getHeaders();
    return fetch(`${BASE_URL}${withLang(path)}`, { headers }).then((r) => handleResponse<T>(r));
  },

  post: async <T>(path: string, body: unknown): Promise<T> => {
    const headers = await getHeaders({ 'Content-Type': 'application/json' });
    return fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r));
  },

  put: async <T>(path: string, body: unknown): Promise<T> => {
    const headers = await getHeaders({ 'Content-Type': 'application/json' });
    return fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r));
  },

  patch: async <T>(path: string, body: unknown): Promise<T> => {
    const headers = await getHeaders({ 'Content-Type': 'application/json' });
    return fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r));
  },

  delete: async (path: string): Promise<void> => {
    const headers = await getHeaders();
    return fetch(`${BASE_URL}${withLang(path)}`, { method: 'DELETE', headers }).then((r) =>
      handleResponse<void>(r)
    );
  },
};
