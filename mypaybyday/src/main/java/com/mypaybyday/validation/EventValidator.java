package com.mypaybyday.validation;

import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class EventValidator {

    @Inject
    RegexValidator regexValidator;

    @Inject
    DateValidator dateValidator;

    public void validate(FinanceEventEntity event) throws BusinessException {
        if (event == null) return;
        regexValidator.validateLettersAndNumbers(event.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateLettersNumbersAndExtras(event.description, RegexValidator.LONG_MAX_LENGTH);

        if (event.transaction != null) {
            dateValidator.validateNotFuture(event.transaction.transactionDate);
        }
    }
}
