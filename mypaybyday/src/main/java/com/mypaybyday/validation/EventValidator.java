package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.TransactionValidator;

@ApplicationScoped
public class EventValidator {

    @Inject
    RegexValidator regexValidator;

    @Inject
    TransactionValidator transactionValidator;

    public void validate(FinanceEventEntity event) throws BusinessException {
        if (event == null) return;
        regexValidator.validateLettersAndNumbers(event.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateLettersNumbersAndExtras(event.description, RegexValidator.LONG_MAX_LENGTH);

        if (event.transaction != null) {
            transactionValidator.validate(event.transaction);
        }
    }
}
