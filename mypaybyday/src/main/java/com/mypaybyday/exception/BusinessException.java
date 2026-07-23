package com.mypaybyday.exception;

import com.mypaybyday.enums.ErrorKind;
import com.mypaybyday.i18n.MsgKey;

public class BusinessException extends RuntimeException {

	private final ErrorKind kind;

	public BusinessException(String message) {
		super(message);
		this.kind = ErrorKind.BUSINESS;
	}

	public BusinessException(MsgKey key, String message) {
		super(message);
		this.kind = key.errorKind();
	}

	public ErrorKind getKind() {
		return kind;
	}
}
