import { logger } from '@/logging/logger.js';

/**
 * Emits one liveness line per minute so that silence in the logs actually means something.
 *
 * Without it, liveness can only be inferred from request volume, which is indistinguishable from
 * nobody using the app. A fixed-rate line removes that ambiguity: no line means the service is gone
 * or the log pipeline broke.
 *
 * It carries `uptimeS` and nothing else. Uptime resetting reveals a restart or crash loop; memory
 * and event-loop numbers would be infrastructure telemetry this application has no way to act on.
 * `event: 'heartbeat'` is already extracted into structured metadata by the Alloy pipeline.
 */

const HEARTBEAT_INTERVAL_MS = 60_000;

const heartbeatLog = logger.child('heartbeat');

export function startHeartbeat(): void {
  const timer = setInterval(() => {
    heartbeatLog.info('alive', { event: 'heartbeat', uptimeS: Math.round(process.uptime()) });
  }, HEARTBEAT_INTERVAL_MS);

  // The heartbeat must never be the reason the process stays alive during a shutdown.
  timer.unref();
}
