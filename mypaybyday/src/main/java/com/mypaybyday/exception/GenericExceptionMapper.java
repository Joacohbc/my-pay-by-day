package com.mypaybyday.exception;

import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import com.mypaybyday.enums.InternalErrorCode;

@Provider
public class GenericExceptionMapper implements ExceptionMapper<Throwable> {

	@Inject
	AppExceptionMapper appExceptionMapper;

	@Override
	public Response toResponse(Throwable throwable) {
		if (throwable instanceof AppException app) {
			return appExceptionMapper.toResponse(app);
		}
		if (throwable instanceof WebApplicationException wae) {
			return wae.getResponse();
		}
		return appExceptionMapper.toResponse(new InternalException(
				InternalErrorCode.UNEXPECTED,
				throwable.getMessage() != null ? throwable.getMessage() : throwable.getClass().getName(),
				throwable));
	}
}
