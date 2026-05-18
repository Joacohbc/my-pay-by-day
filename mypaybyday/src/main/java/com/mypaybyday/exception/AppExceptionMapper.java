package com.mypaybyday.exception;

import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import com.mypaybyday.service.log.RequestContext;
import com.mypaybyday.service.log.RequestContextHolder;

import org.jboss.logging.Logger;
import org.jboss.logging.MDC;

@Provider
public class AppExceptionMapper implements ExceptionMapper<AppException> {

	private static final Logger ERRORS = Logger.getLogger("system-error");

	private static final int HTTP_UNPROCESSABLE_ENTITY = 422;

	@Inject
	RequestContextHolder requestContextHolder;

	@Override
	public Response toResponse(AppException exception) {
		RequestContext ctx = requestContextHolder.current();

		if (exception instanceof InternalException internal) {
			logStructured("INTERNAL_ERROR", internal.getCode().name(), ctx, () ->
					ERRORS.errorf(internal, "%s", internal.getMessage()));
			return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
					.entity(new InternalErrorResponse(internal.getCode().name()))
					.build();
		}
		if (exception instanceof ValidationException validation) {
			logStructured("VALIDATION_ERROR", validation.getErrorKey(), ctx, () ->
					ERRORS.warnf("%s", validation.getMessage()));
			return Response.status(HTTP_UNPROCESSABLE_ENTITY)
					.entity(new ErrorResponse(validation.getMessage()))
					.build();
		}
		if (exception instanceof BusinessException business) {
			logStructured("BUSINESS_ERROR", business.getErrorKey(), ctx, () ->
					ERRORS.warnf("%s", business.getMessage()));
			return Response.status(Response.Status.BAD_REQUEST)
					.entity(new ErrorResponse(business.getMessage()))
					.build();
		}
		logStructured("BUSINESS_ERROR", exception.getErrorKey(), ctx, () ->
				ERRORS.warnf("%s", exception.getMessage()));
		return Response.status(Response.Status.BAD_REQUEST)
				.entity(new ErrorResponse(exception.getMessage()))
				.build();
	}

	private void logStructured(String category, String errorCode, RequestContext ctx, Runnable emit) {
		MDC.put("category", category);
		if (errorCode != null) MDC.put("errorCode", errorCode);
		if (ctx.method() != null) MDC.put("method", ctx.method());
		if (ctx.path() != null) MDC.put("path", ctx.path());
		if (ctx.correlationId() != null) MDC.put("cid", ctx.correlationId());
		try {
			emit.run();
		} finally {
			MDC.remove("category");
			MDC.remove("errorCode");
			MDC.remove("method");
			MDC.remove("path");
			MDC.remove("cid");
		}
	}

	public static class ErrorResponse {
		public String error;
		public ErrorResponse(String error) {
			this.error = error;
		}
	}

	public static class InternalErrorResponse {
		public String error = "internal_error";
		public String code;
		public InternalErrorResponse(String code) {
			this.code = code;
		}
	}
}
