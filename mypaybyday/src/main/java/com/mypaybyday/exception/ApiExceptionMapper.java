package com.mypaybyday.exception;

import com.mypaybyday.enums.ErrorKind;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

import io.quarkus.logging.Log;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * The single place where a failure becomes an HTTP response. Domain failures take their status from
 * the {@link ErrorKind} their {@code MsgKey} implies, framework rejections keep the status the
 * framework chose but are re-bodied into the API's error envelope, and everything else is logged
 * with its stack trace and answered with a generic 500 so internal details never leak.
 */
@Provider
public class ApiExceptionMapper implements ExceptionMapper<Throwable> {

	private final Messages messages;

	public ApiExceptionMapper(Messages messages) {
		this.messages = messages;
	}

	@Override
	public Response toResponse(Throwable throwable) {
		if (throwable instanceof BusinessException businessException) {
			return rejectedByBusinessRule(businessException);
		}
		if (throwable instanceof WebApplicationException webApplicationException) {
			return rejectedByFramework(webApplicationException);
		}
		Log.error("Unhandled exception while processing request", throwable);
		return ApiErrorTranslator.toResponse(ErrorKind.TECHNICAL, messages.get(MsgKey.INTERNAL_SERVER_ERROR));
	}

	private Response rejectedByBusinessRule(BusinessException exception) {
		Log.warnf("Business rule rejected request: %s", exception.getMessage());
		return ApiErrorTranslator.toResponse(exception.getKind(), exception.getMessage());
	}

	/**
	 * A framework rejection that already carries its own body — a streamed file, a redirect — is
	 * passed through untouched; only the empty ones are given the API's error envelope, so a bad path
	 * segment or an unknown route stops answering with the framework's default page.
	 */
	private Response rejectedByFramework(WebApplicationException exception) {
		Response frameworkResponse = exception.getResponse();
		if (frameworkResponse.hasEntity()) {
			return frameworkResponse;
		}
		int status = frameworkResponse.getStatus();
		ErrorKind kind = kindOf(status);
		Log.warnf("Request rejected with status %d: %s", status, exception.getMessage());
		return ApiErrorTranslator.toResponse(kind, status, messages.get(messageOf(kind)));
	}

	private static ErrorKind kindOf(int httpStatus) {
		if (httpStatus == Response.Status.NOT_FOUND.getStatusCode()) {
			return ErrorKind.NOT_FOUND;
		}
		if (httpStatus >= Response.Status.INTERNAL_SERVER_ERROR.getStatusCode()) {
			return ErrorKind.TECHNICAL;
		}
		return ErrorKind.VALIDATION;
	}

	private static MsgKey messageOf(ErrorKind kind) {
		return switch (kind) {
			case NOT_FOUND -> MsgKey.REQUEST_NOT_FOUND;
			case TECHNICAL -> MsgKey.INTERNAL_SERVER_ERROR;
			default -> MsgKey.REQUEST_INVALID;
		};
	}
}
