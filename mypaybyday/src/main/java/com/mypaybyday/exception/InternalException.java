package com.mypaybyday.exception;

import com.mypaybyday.enums.InternalErrorCode;

public class InternalException extends AppException {

	private final InternalErrorCode code;

	public InternalException(InternalErrorCode code, String message) {
		super(message, code.name());
		this.code = code;
	}

	public InternalException(InternalErrorCode code, String message, Throwable cause) {
		super(message, code.name(), cause);
		this.code = code;
	}

	public InternalErrorCode getCode() {
		return code;
	}
}
