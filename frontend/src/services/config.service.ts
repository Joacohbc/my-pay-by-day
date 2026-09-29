import { api } from '@/services/api';

/** Server-side runtime configuration the frontend needs to align with the backend. */
export interface ServerConfig {
  timezone: string;
  /**
   * Currency the server preselects for new amounts. It is a default, not a base currency: the
   * server never converts into it, and every stored amount keeps the code it was recorded with.
   */
  defaultCurrency?: string;
}

export const configService = {
  get: () => api.get<ServerConfig>('/config'),
};
