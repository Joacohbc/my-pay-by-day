package com.mypaybyday.exception;

import com.mypaybyday.i18n.MsgKey;

public class BusinessException extends AppException {

	public BusinessException(String message) {
		super(message, null);
	}

	public BusinessException(String message, MsgKey key) {
		super(message, key != null ? key.key : null);
	}
}
