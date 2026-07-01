import { config } from '@/config.js';
import type { RequestContext } from '@/context.js';

export class BackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'BackendError';
  }
}

export type QueryValue = string | number | boolean | null | undefined | Array<string | number>;

function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Thin HTTP client for the Java (Quarkus) domain backend. Every call forwards the
 * user's timezone and language so the backend applies the same i18n / date logic
 * it would for a direct frontend request.
 */
export class BackendClient {
  constructor(private readonly ctx: RequestContext) {}

  private headers(json: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Timezone': this.ctx.timezone,
      'X-Language': this.ctx.lang,
    };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  private async parse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as Record<string, unknown>;
        message = (body.message ?? body.error ?? body.response ?? message) as string;
      } catch {
        // non-JSON error body
      }
      throw new BackendError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  async get<T>(path: string, params?: Record<string, QueryValue>): Promise<T> {
    const res = await fetch(`${config.backendUrl}${path}${buildQuery(params)}`, {
      method: 'GET',
      headers: this.headers(false),
    });
    return this.parse<T>(res);
  }

  async getText(path: string): Promise<string> {
    const res = await fetch(`${config.backendUrl}${path}`, { method: 'GET', headers: this.headers(false) });
    if (!res.ok) throw new BackendError(res.status, `HTTP ${res.status}`);
    return res.text();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${config.backendUrl}${path}`, {
      method: 'POST',
      headers: this.headers(true),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.parse<T>(res);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${config.backendUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers(true),
      body: JSON.stringify(body),
    });
    return this.parse<T>(res);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${config.backendUrl}${path}`, {
      method: 'PUT',
      headers: this.headers(true),
      body: JSON.stringify(body),
    });
    return this.parse<T>(res);
  }

  async del<T = void>(path: string): Promise<T> {
    const res = await fetch(`${config.backendUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers(false),
    });
    return this.parse<T>(res);
  }
}
