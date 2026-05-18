package com.mypaybyday.exception;

import com.mypaybyday.i18n.MsgKey;

public class ValidationException extends AppException {

	public ValidationException(String message) {
		super(message, null);
	}

	public ValidationException(String message, MsgKey key) {
		super(message, key != null ? key.key : null);
	}
}
