package com.mypaybyday.exception;

public abstract class AppException extends RuntimeException {

	private final String errorKey;

	protected AppException(String message, String errorKey) {
		super(message);
		this.errorKey = errorKey;
	}

	protected AppException(String message, String errorKey, Throwable cause) {
		super(message, cause);
		this.errorKey = errorKey;
	}

	public String getErrorKey() {
		return errorKey;
	}
}
