package com.mypaybyday.filter;

import java.util.UUID;

import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;

import org.jboss.logging.MDC;

/**
 * Resolves a correlation ID for every request and makes it traceable across logs and services.
 * <p>
 * The ID is read from the {@code X-Request-Id} header (propagated by the frontend and the chatbot)
 * or generated when absent. It is stored both in the logging {@link MDC} — so the console/JSON
 * pattern {@code %X{requestId}} stamps it on every log line of the request — and in
 * {@link RequestIdContext} for services that need it explicitly. The same ID is echoed back on the
 * response so the caller can correlate the round trip.
 * <p>
 * The low {@link Priorities#AUTHENTICATION} priority makes the request side run before
 * {@link RequestLoggingFilter} (populating the MDC first) and the response side run after it
 * (clearing the MDC only once the request/response line has been logged).
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
public class CorrelationIdFilter implements ContainerRequestFilter, ContainerResponseFilter {

	public static final String REQUEST_ID_HEADER = "X-Request-Id";
	public static final String MDC_KEY = "requestId";

	private final RequestIdContext requestIdContext;

	public CorrelationIdFilter(RequestIdContext requestIdContext) {
		this.requestIdContext = requestIdContext;
	}

	@Override
	public void filter(ContainerRequestContext req) {
		String requestId = req.getHeaderString(REQUEST_ID_HEADER);
		if (requestId == null || requestId.isBlank()) {
			requestId = UUID.randomUUID().toString();
		}
		requestIdContext.setRequestId(requestId);
		MDC.put(MDC_KEY, requestId);
	}

	@Override
	public void filter(ContainerRequestContext req, ContainerResponseContext res) {
		String requestId = requestIdContext.getRequestId();
		if (requestId != null) {
			res.getHeaders().putSingle(REQUEST_ID_HEADER, requestId);
		}
		MDC.remove(MDC_KEY);
	}
}
