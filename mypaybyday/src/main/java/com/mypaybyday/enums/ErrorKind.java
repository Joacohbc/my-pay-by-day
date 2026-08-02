package com.mypaybyday.enums;

import jakarta.ws.rs.core.Response;

/**
 * Business classification of a failure, and the single source of truth for the HTTP status the API
 * answers with. A {@code BusinessException} derives its kind from the {@code MsgKey} it carries, so
 * the status is decided once here instead of at every throw site.
 */
public enum ErrorKind {
	NOT_FOUND(Response.Status.NOT_FOUND),
	CONFLICT(Response.Status.CONFLICT),
	VALIDATION(Response.Status.BAD_REQUEST),
	INTEGRITY(Response.Status.BAD_REQUEST),
	LIMIT(Response.Status.BAD_REQUEST),
	BUSINESS(Response.Status.BAD_REQUEST),
	TECHNICAL(Response.Status.INTERNAL_SERVER_ERROR);

	private final Response.Status httpStatus;

	ErrorKind(Response.Status httpStatus) {
		this.httpStatus = httpStatus;
	}

	public Response.Status httpStatus() {
		return httpStatus;
	}
}
