package com.mypaybyday.exception;

import java.util.stream.Collectors;

import com.mypaybyday.exception.BusinessExceptionMapper.ErrorResponse;

import io.quarkus.logging.Log;
import jakarta.annotation.Priority;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Maps bean-validation failures to a logged HTTP 400 with the same {@code {error}} shape the rest of
 * the API uses. Without this, constraint violations are handled by the framework's default mapper and
 * never surface in the logs, so an invalid payload is invisible to operators. The low {@link Priority}
 * makes this mapper win over the built-in one.
 */
@Provider
@Priority(1)
public class ConstraintViolationExceptionMapper implements ExceptionMapper<ConstraintViolationException> {

	@Override
	public Response toResponse(ConstraintViolationException exception) {
		String details = exception.getConstraintViolations().stream()
				.map(ConstraintViolationExceptionMapper::describe)
				.collect(Collectors.joining("; "));
		Log.warnf("Request rejected by validation: %s", details);
		return Response.status(Response.Status.BAD_REQUEST)
				.entity(new ErrorResponse(details))
				.build();
	}

	private static String describe(ConstraintViolation<?> violation) {
		return violation.getPropertyPath() + ": " + violation.getMessage();
	}
}
