package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.TransactionValidator;

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
        regexValidator.validateLettersAndNumbers(event.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateLettersNumbersAndExtras(event.description, RegexValidator.LONG_MAX_LENGTH);

        if (event.transaction != null) {
            transactionValidator.validate(event.transaction);
        }
    }
}
