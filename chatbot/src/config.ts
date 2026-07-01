function env(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  port: intEnv('CHATBOT_PORT', 3001),

  openRouter: {
    apiKey: env('OPENROUTER_API_KEY', 'changeme'),
    baseUrl: env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
  },

  models: {
    /** Multimodal model (text + image + audio) used for chat and the agent loop. */
    large: env('MODEL_LARGE', 'google/gemini-2.5-flash'),
    /** Fast/cheap model used for short text generation, extraction and memory summarisation. */
    fast: env('MODEL_FAST', 'google/gemini-flash-lite'),
  },

  /** Base URL of the Java (Quarkus) domain backend that exposes the REST tools. */
  backendUrl: env('BACKEND_URL', 'http://127.0.0.1:8080'),

  database: {
    path: env('CHATBOT_DB_PATH', './chatbot.db'),
  },

  agent: {
    /** Maximum tool-calling steps per agent run before the loop stops. */
    maxSteps: intEnv('AGENT_MAX_STEPS', 25),
    /** Maximum conversation messages kept before compaction kicks in. */
    maxChatMessages: intEnv('AGENT_MAX_CHAT_MESSAGES', 50),
  },

  log: {
    /** Verbosity threshold: silent | error | warn | info | debug | trace. */
    level: env('LOG_LEVEL', 'info'),
    /** Output format: 'text' (human-readable) or 'json' (structured, one object per line). */
    format: env('LOG_FORMAT', 'text'),
    /** Max characters per logged field value before truncation. */
    maxFieldChars: intEnv('LOG_MAX_FIELD_CHARS', 800),
    /** Prefix each line with an ISO timestamp (text format only). */
    timestamps: env('LOG_TIMESTAMPS', 'true') !== 'false',
  },
} as const;

export type AppConfig = typeof config;
