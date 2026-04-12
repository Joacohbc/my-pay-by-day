package com.mypaybyday.validation;

import java.math.BigDecimal;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

@ApplicationScoped
public class NumberValidator {

	private final Messages messages;

	public NumberValidator(Messages messages) {
		this.messages = messages;
	}

    public void validatePositive(BigDecimal value) throws BusinessException {
        if (value != null && value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_NUMBER_POSITIVE));
        }
    }

    public void validateNonNegative(BigDecimal value) throws BusinessException {
        if (value != null && value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_NUMBER_NON_NEGATIVE));
        }
    }

    public void validateRange(BigDecimal value, BigDecimal min, BigDecimal max) throws BusinessException {
        if (value != null && (value.compareTo(min) < 0 || value.compareTo(max) > 0)) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_NUMBER_RANGE, min, max));
        }
    }
}
