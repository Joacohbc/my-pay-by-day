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
        regexValidator.validateName(event.name);
        regexValidator.validateDescription(event.description);

        if (event.transaction != null) {
            dateValidator.validateNotFuture(event.transaction.transactionDate);
        }
    }
}
