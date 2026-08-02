package com.mypaybyday.exception;

import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import com.mypaybyday.enums.ErrorKind;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

import io.quarkus.logging.Log;
import jakarta.annotation.Priority;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Answers a body that parses as JSON but carries a value the target type rejects — an unknown enum
 * constant, a string where a number is expected — with the API's error envelope. Quarkus ships its
 * own mapper for this exception that reports the offending field and its position in the document,
 * which no client of this API reads, so this one takes over via the low {@link Priority}. The parse
 * detail is logged rather than returned: it describes the JSON, not anything the user can act on.
 */
@Provider
@Priority(1)
public class InvalidPayloadValueExceptionMapper implements ExceptionMapper<MismatchedInputException> {

	private final Messages messages;

	public InvalidPayloadValueExceptionMapper(Messages messages) {
		this.messages = messages;
	}

	@Override
	public Response toResponse(MismatchedInputException exception) {
		Log.warnf("Request rejected by payload parsing: %s", exception.getOriginalMessage());
		return ApiErrorTranslator.toResponse(ErrorKind.VALIDATION, messages.get(MsgKey.REQUEST_INVALID));
	}
}
