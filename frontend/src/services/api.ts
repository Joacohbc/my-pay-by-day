import i18n from '@/i18n';

const BASE_URL = '/api';

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
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string): Promise<T> =>
    fetch(`${BASE_URL}${withLang(path)}`, { headers: { Accept: 'application/json' } }).then(
      (r) => handleResponse<T>(r)
    ),

  post: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  put: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  patch: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${BASE_URL}${withLang(path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  delete: (path: string): Promise<void> =>
    fetch(`${BASE_URL}${withLang(path)}`, { method: 'DELETE' }).then((r) =>
      handleResponse<void>(r)
    ),
};
