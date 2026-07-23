/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Client logger verbosity threshold: silent | error | warn | info | debug | trace. */
  readonly VITE_LOG_LEVEL?: string;
}

/** Injected at build time by Vite `define` (see vite.config.ts). Short git sha or "dev". */
declare const __APP_VERSION__: string;
