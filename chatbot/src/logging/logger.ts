import { config } from '@/config.js';
import { currentRequestFields } from '@/logging/requestStore.js';

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

function configuredThreshold(): number {
  const level = config.log.level as LogLevel;
  return LEVEL_ORDER[level] ?? LEVEL_ORDER.info;
}

function truncate(value: unknown): string {
  let text: string;
  if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }
  if (text === undefined) return 'undefined';
  const max = config.log.maxFieldChars;
  return text.length > max ? `${text.slice(0, max)}…(${text.length} chars)` : text;
}

function formatText(level: LogLevel, scope: string, message: string, fields?: LogFields): string {
  const ts = config.log.timestamps ? `${new Date().toISOString()} ` : '';
  const head = `${ts}${level.toUpperCase().padEnd(5)} [${scope}] ${message}`;
  if (!fields) return head;
  const tail = Object.entries(fields)
    .map(([key, value]) => `${key}=${truncate(value)}`)
    .join(' ');
  return tail ? `${head} ${tail}` : head;
}

function formatJson(level: LogLevel, scope: string, message: string, fields?: LogFields): string {
  const record: Record<string, unknown> = { ts: new Date().toISOString(), level, scope, msg: message };
  for (const [key, value] of Object.entries(fields ?? {})) {
    record[key] = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? value
      : truncate(value);
  }
  return JSON.stringify(record);
}

function emit(level: LogLevel, scope: string, message: string, fields?: LogFields): void {
  if (LEVEL_ORDER[level] > configuredThreshold()) return;
  const ambient = currentRequestFields();
  const effectiveFields = ambient ? { ...ambient, ...fields } : fields;
  const line = config.log.format === 'json'
    ? formatJson(level, scope, message, effectiveFields)
    : formatText(level, scope, message, effectiveFields);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export interface Logger {
  error(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  trace(message: string, fields?: LogFields): void;
  /** Returns a logger tagged with a sub-scope (e.g. `logger.child('tool')`). */
  child(scope: string): Logger;
  /**
   * Returns a logger that stamps `boundFields` (e.g. `{ requestId, chatId }`) onto every line,
   * so per-request context is traceable without repeating it at each call site.
   */
  with(boundFields: LogFields): Logger;
}

function createLogger(scope: string, boundFields?: LogFields): Logger {
  const merge = (fields?: LogFields): LogFields | undefined => {
    if (!boundFields) return fields;
    return fields ? { ...boundFields, ...fields } : boundFields;
  };
  return {
    error: (message, fields) => emit('error', scope, message, merge(fields)),
    warn: (message, fields) => emit('warn', scope, message, merge(fields)),
    info: (message, fields) => emit('info', scope, message, merge(fields)),
    debug: (message, fields) => emit('debug', scope, message, merge(fields)),
    trace: (message, fields) => emit('trace', scope, message, merge(fields)),
    child: (childScope) => createLogger(`${scope}:${childScope}`, boundFields),
    with: (extraFields) => createLogger(scope, merge(extraFields)),
  };
}

/** Root application logger. Create scoped children with `logger.child('scope')`. */
export const logger = createLogger('chatbot');
