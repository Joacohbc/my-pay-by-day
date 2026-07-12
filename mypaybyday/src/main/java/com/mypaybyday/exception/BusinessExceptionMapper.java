package com.mypaybyday.exception;

import io.quarkus.logging.Log;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class BusinessExceptionMapper implements ExceptionMapper<BusinessException> {

	@Override
	public Response toResponse(BusinessException exception) {
		Log.debugf("Business rule rejected request: %s", exception.getMessage());
		return Response.status(Response.Status.BAD_REQUEST)
				.entity(new ErrorResponse(exception.getMessage()))
				.build();
	}

	public static class ErrorResponse {
		public String error;
		public ErrorResponse(String error) {
			this.error = error;
		}
	}
}
