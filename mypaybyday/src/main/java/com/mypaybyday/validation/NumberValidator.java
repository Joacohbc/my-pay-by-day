package com.mypaybyday.validation;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;

@ApplicationScoped
public class NumberValidator {

    @Inject
    Messages messages;

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
