import { activeLogLevel } from '@/lib/logger';

/**
 * Ships each API call as the browser observed it to the same `/client-logs` nginx sink
 * `errorReporter` uses, where Alloy parses it into Loki. One JSON object per POST, because nginx
 * logs one line per request and Alloy parses one object per line.
 *
 * The point is not page-speed telemetry — with a single user, the developer is the user and already
 * feels that. It is that this app queues events offline: a call that never reached the server means
 * an action the user believes was recorded may not be. Only the client can see those.
 *
 * Kept separate from `errorReporter` on purpose: the error buffer is capped and persisted to
 * IndexedDB so a crash survives a reload, and telemetry must never evict an error from it. This is
 * fire-and-forget — in-memory only, dropped on transport failure, never retried.
 */

const ENDPOINT = `${window.location.origin}/client-logs`;
const FLUSH_INTERVAL_MS = 15_000;
const MAX_BUFFERED_ENTRIES = 100;

/** Fraction of ordinary API calls that ship. Failures and slow calls bypass this and always ship. */
const API_SAMPLE_RATE = 0.1;
const SLOW_CALL_MS = 1_000;

/** Status reported when the request never reached the server (network down, CORS, aborted). */
const NETWORK_FAILURE_STATUS = 0;

const isTelemetryEnabled = activeLogLevel !== 'silent';

interface ClientTelemetryBase {
  level: 'info';
  source: 'frontend';
  ts: string;
  route: string;
  appVersion: string;
}

interface ApiTimingEntry extends ClientTelemetryBase {
  kind: 'api-timing';
  method: string;
  path: string;
  durationMs: number;
  status: number;
  ok: boolean;
}

interface OfflineQueueEntry extends ClientTelemetryBase {
  kind: 'offline-queue';
  pendingCount: number;
  oldestAgeHours: number;
}

type TelemetryEntry = ApiTimingEntry | OfflineQueueEntry;

export interface ApiMeasurement {
  method: string;
  path: string;
  durationMs: number;
  status: number;
  ok: boolean;
}

const ID_SEGMENT = /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Collapses identifier segments so `/events/42` and `/files/<uuid>/content` become `/events/:id` and
 * `/files/:id/content`. Without this every entity id would become its own series in Loki.
 */
export function templatePath(path: string): string {
  const [pathname] = path.split('?');
  return pathname
    .split('/')
    .map((segment) => (ID_SEGMENT.test(segment) ? ':id' : segment))
    .join('/');
}

/**
 * A dropped entry is dropped for good — telemetry never retries and never reports its own failure,
 * so a broken sink cannot turn into a request storm. `keepalive` lets the last flush survive unload.
 */
function send(entry: TelemetryEntry): void {
  const body = JSON.stringify(entry);
  const beaconAccepted = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
  if (beaconAccepted) return;

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

const pendingEntries: TelemetryEntry[] = [];

function baseEntry(): ClientTelemetryBase {
  return {
    level: 'info',
    source: 'frontend',
    ts: new Date().toISOString(),
    route: templatePath(window.location.pathname),
    appVersion: __APP_VERSION__,
  };
}

function flush(): void {
  if (pendingEntries.length === 0) return;
  for (const entry of pendingEntries.splice(0, pendingEntries.length)) send(entry);
}

/**
 * Records one API call as observed by the browser. Comparing this against the backend's own numbers
 * is what exposes edge, proxy and connectivity failures the server never sees.
 */
export function reportApiTiming(measurement: ApiMeasurement): void {
  if (!isTelemetryEnabled) return;

  const isAlwaysInteresting = !measurement.ok || measurement.durationMs >= SLOW_CALL_MS;
  if (!isAlwaysInteresting && Math.random() >= API_SAMPLE_RATE) return;

  if (pendingEntries.length >= MAX_BUFFERED_ENTRIES) pendingEntries.shift();
  pendingEntries.push({
    ...baseEntry(),
    kind: 'api-timing',
    method: measurement.method,
    path: templatePath(measurement.path),
    durationMs: Math.round(measurement.durationMs),
    status: measurement.status,
    ok: measurement.ok,
  });
}

const MILLIS_PER_HOUR = 60 * 60 * 1000;

/**
 * Reports the offline event queue when the app starts with entries still in it. These are events the
 * user believes are recorded but the server has never seen — unspent money that will not appear in
 * any balance. `oldestAgeHours` is what separates a normal queue draining in minutes from data that
 * has been silently stranded for days.
 *
 * Sent immediately rather than buffered, because it fires during startup and the user may navigate
 * away before the next flush.
 */
export function reportOfflineQueue(pendingCount: number, oldestCreatedAt: string | undefined): void {
  if (!isTelemetryEnabled || pendingCount === 0) return;

  const oldestMillis = oldestCreatedAt ? Date.now() - new Date(oldestCreatedAt).getTime() : 0;
  send({
    ...baseEntry(),
    kind: 'offline-queue',
    pendingCount,
    oldestAgeHours: Math.max(0, Math.round(oldestMillis / MILLIS_PER_HOUR)),
  });
}

export { NETWORK_FAILURE_STATUS };

export function installRumReporter(): void {
  if (!isTelemetryEnabled) return;

  setInterval(flush, FLUSH_INTERVAL_MS);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
