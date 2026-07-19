package com.mypaybyday.exception;

import org.jboss.logging.MDC;

import com.mypaybyday.enums.ErrorKind;
import com.mypaybyday.exception.BusinessExceptionMapper.ErrorResponse;
import com.mypaybyday.filter.CorrelationIdFilter;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

import io.quarkus.logging.Log;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Catch-all mapper for exceptions that no more specific mapper handles. It logs the failure at
 * {@code error} with the full stack trace — the correlation ID is already on the log line via the
 * MDC populated by {@code CorrelationIdFilter} — and returns a generic localized HTTP 500 so
 * internal details never leak to the client.
 * <p>
 * Framework {@link WebApplicationException}s carry their own status/response and are passed through
 * untouched.
 */
@Provider
public class UncaughtExceptionMapper implements ExceptionMapper<Exception> {

	private final Messages messages;

	public UncaughtExceptionMapper(Messages messages) {
		this.messages = messages;
	}

	@Override
	public Response toResponse(Exception exception) {
		if (exception instanceof WebApplicationException webApplicationException) {
			return webApplicationException.getResponse();
		}
		MDC.put(CorrelationIdFilter.MDC_ERROR_KIND_KEY, ErrorKind.TECHNICAL.name().toLowerCase());
		Log.error("Unhandled exception while processing request", exception);
		return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
				.entity(new ErrorResponse(messages.get(MsgKey.INTERNAL_SERVER_ERROR)))
				.build();
	}
}
