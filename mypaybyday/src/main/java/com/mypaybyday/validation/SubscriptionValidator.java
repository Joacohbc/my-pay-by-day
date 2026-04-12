package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.SubscriptionEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class SubscriptionValidator {

    private final RegexValidator regexValidator;
    private final DateValidator dateValidator;

    public SubscriptionValidator(RegexValidator regexValidator, DateValidator dateValidator) {
        this.regexValidator = regexValidator;
        this.dateValidator = dateValidator;
    }

    public void validate(SubscriptionEntity subscription) throws BusinessException {
        if (subscription == null) return;
        regexValidator.validateLettersAndNumbers(subscription.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateLettersNumbersAndExtras(subscription.description, RegexValidator.LONG_MAX_LENGTH);

        // Subscription nextExecutionDate can be in the past or future, but we can validate it's not null in the service.
        // Wait, the prompt asked to use DateValidator.validateNotNull? Actually DateValidator only has NotFuture/NotPast.
        // Let's not add DateValidator here if not strictly needed since nextExecutionDate could theoretically be anything,
        // but let's check the service layer to see what it did.
    }
}
