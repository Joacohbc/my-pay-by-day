package com.mypaybyday.config;

import java.lang.management.ManagementFactory;
import java.util.UUID;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.filter.CorrelationIdFilter;
import io.quarkus.scheduler.Scheduled;
import org.jboss.logging.Logger;
import org.jboss.logging.MDC;

/**
 * Emits one liveness line per minute so that silence in the logs actually means something.
 *
 * <p>Without it, the health dashboard can only infer liveness from request volume, which is
 * indistinguishable from nobody using the app — the reason its panel is titled "gaps = silent, not
 * necessarily down". A fixed-rate line removes that ambiguity: no line means the service is gone or
 * the log pipeline broke.
 *
 * <p>It carries {@code uptime_s} and nothing else. Uptime resetting reveals a restart or crash loop;
 * every other runtime number (heap, threads, disk) would be infrastructure telemetry that this
 * application has no way to act on.
 */
@ApplicationScoped
public class RuntimeHeartbeatLogger {

	private static final Logger LOG = Logger.getLogger(RuntimeHeartbeatLogger.class);

	private static final String HEARTBEAT_SOURCE = "heartbeat";
	private static final long MILLIS_PER_SECOND = 1000L;

	@Scheduled(every = "60s", delayed = "10s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	public void logRuntimeHeartbeat() {
		MDC.put(CorrelationIdFilter.MDC_KEY, HEARTBEAT_SOURCE + "-" + UUID.randomUUID());
		MDC.put(CorrelationIdFilter.MDC_SOURCE_KEY, HEARTBEAT_SOURCE);
		try {
			LOG.infof("heartbeat | uptime_s=%d", uptimeSeconds());
		} finally {
			MDC.remove(CorrelationIdFilter.MDC_KEY);
			MDC.remove(CorrelationIdFilter.MDC_SOURCE_KEY);
		}
	}

	private long uptimeSeconds() {
		return ManagementFactory.getRuntimeMXBean().getUptime() / MILLIS_PER_SECOND;
	}
}
