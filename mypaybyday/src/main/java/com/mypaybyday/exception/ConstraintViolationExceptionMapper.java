package com.mypaybyday.exception;

import java.util.stream.Collectors;

import com.mypaybyday.enums.ErrorKind;

import io.quarkus.logging.Log;
import jakarta.annotation.Priority;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Maps bean-validation failures to a logged HTTP 400 with the same error envelope the rest of the
 * API uses. This cannot be folded into {@link ApiExceptionMapper}: the framework picks the most
 * specific mapper, so its built-in violation mapper would win over a generic {@code Throwable} one.
 * The low {@link Priority} makes this mapper win over the built-in one instead.
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
		return ApiErrorTranslator.toResponse(ErrorKind.VALIDATION, details);
	}

	private static String describe(ConstraintViolation<?> violation) {
		return violation.getPropertyPath() + ": " + violation.getMessage();
	}
}
