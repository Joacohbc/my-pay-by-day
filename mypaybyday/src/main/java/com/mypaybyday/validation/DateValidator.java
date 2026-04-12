package com.mypaybyday.validation;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

@ApplicationScoped
public class DateValidator {

    @Inject
    Messages messages;

    public void validateDateRange(LocalDate startDate, LocalDate endDate) throws BusinessException {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_DATE_RANGE_INVALID));
        }
    }

    public void validateDateRange(LocalDateTime startDate, LocalDateTime endDate) throws BusinessException {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_DATE_RANGE_INVALID));
        }
    }

    public void validateNotFuture(LocalDate date) throws BusinessException {
        if (date != null && date.isAfter(LocalDate.now())) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_DATE_IN_FUTURE));
        }
    }

    public void validateNotFuture(LocalDateTime date) throws BusinessException {
        if (date != null && date.isAfter(LocalDateTime.now())) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_DATE_IN_FUTURE));
        }
    }

    public void validateNotPast(LocalDate date) throws BusinessException {
        if (date != null && date.isBefore(LocalDate.now())) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_DATE_IN_PAST));
        }
    }

    public void validateNotPast(LocalDateTime date) throws BusinessException {
        if (date != null && date.isBefore(LocalDateTime.now())) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_DATE_IN_PAST));
        }
    }
}
