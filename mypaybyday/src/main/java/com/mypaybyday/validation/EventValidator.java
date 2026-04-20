package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class EventValidator {

    private final RegexValidator regexValidator;
    private final TransactionValidator transactionValidator;

    public EventValidator(RegexValidator regexValidator, TransactionValidator transactionValidator) {
        this.regexValidator = regexValidator;
        this.transactionValidator = transactionValidator;
    }

    public void validate(FinanceEventEntity event) throws BusinessException {
        if (event == null) return;

        event.name = regexValidator.sanitize(event.name);
        event.description = regexValidator.sanitize(event.description);

        regexValidator.validateNameAndDescription(event.name, event.description);

        if (event.transaction != null) {
            transactionValidator.validate(event.transaction);
        }
    }
}
