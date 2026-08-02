package com.mypaybyday.exception;

import org.jboss.logging.MDC;

import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.enums.ErrorKind;
import com.mypaybyday.filter.CorrelationIdFilter;

import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Builds the single error envelope the API answers with and tags the log line with the failure
 * kind. Every {@code ExceptionMapper} goes through here so the wire shape and the {@code errorKind}
 * MDC field can never drift between them.
 */
public final class ApiErrorTranslator {

	private ApiErrorTranslator() {
	}

	public static Response toResponse(ErrorKind kind, String message) {
		return toResponse(kind, kind.httpStatus().getStatusCode(), message);
	}

	/**
	 * Variant for failures whose status is imposed from outside the domain — a framework rejection
	 * such as 405 or 415 — where the kind still classifies the log line but does not pick the status.
	 */
	public static Response toResponse(ErrorKind kind, int httpStatus, String message) {
		MDC.put(CorrelationIdFilter.MDC_ERROR_KIND_KEY, kind.name().toLowerCase());
		return Response.status(httpStatus)
				.entity(new ErrorResponseDto(message))
				.type(MediaType.APPLICATION_JSON)
				.build();
	}
}
