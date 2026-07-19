import { useErrorLogStore, type ClientErrorEntry, type ClientErrorKind } from '@/store/errorLogStore';

const ENDPOINT = `${window.location.origin}/client-logs`;
const FLUSH_INTERVAL_MS = 60_000;
const MAX_TEXT_CHARS = 4_000;

function truncate(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  return text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}…(${text.length} chars)` : text;
}

function baseEntry(kind: ClientErrorKind, message: string): ClientErrorEntry {
  return {
    level: 'error',
    source: 'frontend',
    ts: new Date().toISOString(),
    kind,
    message: truncate(message) ?? '',
    url: window.location.href,
    route: window.location.pathname,
    userAgent: navigator.userAgent,
    requestId: crypto.randomUUID(),
    appVersion: __APP_VERSION__,
  };
}

function enqueue(entry: ClientErrorEntry): void {
  useErrorLogStore.getState().enqueue(entry);
}

function onWindowError(event: ErrorEvent): void {
  const isResourceError = !event.error && event.target !== window;
  if (isResourceError) return;
  const error = event.error instanceof Error ? event.error : undefined;
  enqueue({
    ...baseEntry('error', event.message || error?.message || 'Unknown error'),
    stack: truncate(error?.stack),
    line: event.lineno || undefined,
    col: event.colno || undefined,
  });
}

function onUnhandledRejection(event: PromiseRejectionEvent): void {
  const reason = event.reason;
  const error = reason instanceof Error ? reason : undefined;
  const message = error?.message ?? (typeof reason === 'string' ? reason : JSON.stringify(reason));
  enqueue({
    ...baseEntry('unhandledrejection', message ?? 'Unhandled promise rejection'),
    stack: truncate(error?.stack),
  });
}

/** Called by the top-level React error boundary; the boundary owns no reporting logic itself. */
export function reportReactError(error: Error, componentStack: string): void {
  enqueue({
    ...baseEntry('react', error.message || 'React render error'),
    stack: truncate(error.stack),
    componentStack: truncate(componentStack),
  });
}

/**
 * Flush the buffer to the nginx sink. Each entry is POSTed as its own request so nginx logs one
 * JSON object per line, which Alloy parses field-by-field into Loki. Transport failures are
 * re-buffered for the next tick (bounded by the store cap). The flush transport never feeds its own
 * failure back into the buffer as a new captured error — a failed send is logged, never re-captured,
 * to avoid a report storm.
 */
async function postEntry(entry: ClientErrorEntry): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    });
    return res.ok;
  } catch (err) {
    console.warn('[errorReporter] flush failed, keeping buffer for retry', err);
    return false;
  }
}

async function flush(): Promise<void> {
  const entries = useErrorLogStore.getState().drain();
  if (entries.length === 0) return;
  const results = await Promise.all(entries.map(postEntry));
  entries.filter((_, i) => !results[i]).forEach((entry) => useErrorLogStore.getState().enqueue(entry));
}

function flushWithBeacon(): void {
  const entries = useErrorLogStore.getState().drain();
  for (const entry of entries) {
    const blob = new Blob([JSON.stringify(entry)], { type: 'application/json' });
    navigator.sendBeacon(ENDPOINT, blob);
  }
}

let installed = false;

export function installErrorReporter(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushWithBeacon();
  });
  window.addEventListener('pagehide', flushWithBeacon);
}
