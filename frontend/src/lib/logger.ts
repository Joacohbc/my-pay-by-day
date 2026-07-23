import { captureError } from '@/lib/errorReporter';
import type { ClientErrorKind } from '@/store/errorLogStore';

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

export type LogFields = Record<string, unknown>;

// In production (Docker) VITE_LOG_LEVEL is injected at container startup via /env.js into
// window.__env__. In dev, Vite exposes it through import.meta.env. Mirrors resolveBaseUrl in api.ts.
function resolveLogLevel(): LogLevel {
  const runtimeEnv = (window as { __env__?: Record<string, unknown> }).__env__;
  const runtimeLevel = normalizeLevel(runtimeEnv?.VITE_LOG_LEVEL);
  if (runtimeLevel) return runtimeLevel;

  const buildTimeLevel = normalizeLevel(import.meta.env.VITE_LOG_LEVEL);
  if (buildTimeLevel) return buildTimeLevel;

  return 'info';
}

function normalizeLevel(value: unknown): LogLevel | undefined {
  if (typeof value !== 'string') return undefined;
  const level = value.toLowerCase() as LogLevel;
  return level in LEVEL_ORDER ? level : undefined;
}

/** The threshold this build runs at. `silent` also acts as the opt-out switch for RUM telemetry. */
export const activeLogLevel: LogLevel = resolveLogLevel();

const threshold = LEVEL_ORDER[activeLogLevel];

function errorFrom(fields?: LogFields): Error | undefined {
  const candidate = fields?.error ?? fields?.err;
  return candidate instanceof Error ? candidate : undefined;
}

function emit(level: LogLevel, scope: string, message: string, shipKind: ClientErrorKind, fields?: LogFields): void {
  if (LEVEL_ORDER[level] > threshold) return;

  const line = `${level.toUpperCase().padEnd(5)} [${scope}] ${message}`;
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (fields) consoleFn(line, fields);
  else consoleFn(line);

  if (level === 'error') captureError(shipKind, `[${scope}] ${message}`, errorFrom(fields), fields);
}

export interface Logger {
  error(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  trace(message: string, fields?: LogFields): void;
  /** Returns a logger tagged with a sub-scope (e.g. `logger.child('api')`). */
  child(scope: string): Logger;
  /** Returns a logger that stamps `boundFields` onto every line, so context is traceable per call site. */
  with(boundFields: LogFields): Logger;
}

function createLogger(scope: string, shipKind: ClientErrorKind, boundFields?: LogFields): Logger {
  const merge = (fields?: LogFields): LogFields | undefined => {
    if (!boundFields) return fields;
    return fields ? { ...boundFields, ...fields } : boundFields;
  };
  return {
    error: (message, fields) => emit('error', scope, message, shipKind, merge(fields)),
    warn: (message, fields) => emit('warn', scope, message, shipKind, merge(fields)),
    info: (message, fields) => emit('info', scope, message, shipKind, merge(fields)),
    debug: (message, fields) => emit('debug', scope, message, shipKind, merge(fields)),
    trace: (message, fields) => emit('trace', scope, message, shipKind, merge(fields)),
    child: (childScope) => createLogger(`${scope}:${childScope}`, shipKind, boundFields),
    with: (extraFields) => createLogger(scope, shipKind, merge(extraFields)),
  };
}

/** Root application logger. Create scoped children with `logger.child('scope')`. Errors ship as `caught`. */
export const logger = createLogger('frontend', 'caught');

/** Logger for the api layer; its errors ship to Loki tagged `kind:'api'` for query/mutation failures. */
export const apiLogger = createLogger('frontend:api', 'api');
