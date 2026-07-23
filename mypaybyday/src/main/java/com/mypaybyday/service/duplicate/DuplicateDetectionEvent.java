package com.mypaybyday.service.duplicate;

import org.jboss.logging.MDC;

/**
 * Fired (async) when an entity changes and may need duplicate detection. Captures the originating
 * request's correlation id at fire time so the async observer — which runs on a worker thread that
 * loses the request-scoped MDC — can restore it and keep the background work traceable to the request.
 */
public record DuplicateDetectionEvent(String type, Long id, String requestId) {

	public static DuplicateDetectionEvent forEvent(Long id) {
		return new DuplicateDetectionEvent("EVENT", id, currentRequestId());
	}

	public static DuplicateDetectionEvent forCategory(Long id) {
		return new DuplicateDetectionEvent("CATEGORY", id, currentRequestId());
	}

	public static DuplicateDetectionEvent forTag(Long id) {
		return new DuplicateDetectionEvent("TAG", id, currentRequestId());
	}

	private static String currentRequestId() {
		Object value = MDC.get("requestId");
		return value != null ? value.toString() : null;
	}
}
